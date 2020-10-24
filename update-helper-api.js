/*
**  update-helper -- Application Update Process Helper Utility
**  Copyright (c) 2020 Dr. Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const fs     = require("fs")
const os     = require("os")
const path   = require("path")
const got    = require("got")
const execa  = require("execa")
const AdmZip = require("adm-zip")
const tmp    = require("tmp")
const mkdirp = require("mkdirp")
const pkg    = require("./package.json")

class UpdateHelper {
    constructor (options = {}) {
        /*  provide option defaults  */
        this.options = Object.assign({}, {
            kill:     0,
            wait:     0,
            rename:   false,
            source:   "",
            target:   "",
            cleanup:  [],
            execute:  "",
            open:     "",
            progress: (step, percent) => {}
        }, options)

        /*  determine current system  */
        this.sys = ""
        if      (os.platform() === "win32")  this.sys = "win"
        else if (os.platform() === "darwin") this.sys = "mac"
        else if (os.platform() === "linux")  this.sys = "lnx"
        else throw new Error(`current platform "${os.platform()}" is not supported`)
    }

    /*  perform the upgrade operation  */
    async update () {
        /*  sanity check usage  */
        if (this.options.source === "")
            throw new Error("mandatory option 'source' missing")
        if (this.options.target === "")
            throw new Error("mandatory option 'target' missing")

        /*  download ZIP archive of CLI binary  */
        const url = "https://github.com/rse/update-helper/releases/download/" +
            `${pkg.version}/update-helper-cli-${this.sys}-x64.zip`
        this.options.progress("downloading update helper distribution", 0.0)
        const req = got({
            method:       "GET",
            url:          url,
            headers:      { "User-Agent": `${pkg.name}/${pkg.version}` },
            responseType: "buffer"
        })
        req.on("downloadProgress", (p) => {
            let completed = p.transferred / p.total
            if (isNaN(completed))
                completed = 0
            this.options.progress("downloading update helper distribution", completed)
        })
        const response = await req
        const tmpfile = tmp.fileSync()
        await fs.promises.writeFile(tmpfile.name, response.body, { encoding: null })
        this.options.progress("downloading update helper distribution", 1.0)

        /*  extract ZIP archive of CLI binary  */
        this.options.progress("extracting update helper distribution", 0.0)
        const tmpdir = tmp.dirSync()
        const zip = new AdmZip(tmpfile.name)
        const dirCreated = {}
        const entries = zip.getEntries()
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            this.options.progress("extracting update helper distribution", i / entries.length)

            /*  determine result file path on filesystem  */
            const filePath = path.join(tmpdir.name, entry.entryName)

            /*  determine directory path and automatically create missing directories  */
            const dirPath = entry.isDirectory ? filePath : path.dirname(filePath)
            if (!dirCreated[dirPath]) {
                await mkdirp(dirPath)
                dirCreated[dirPath] = true
            }

            /*  create resulting entry  */
            if (((entry.attr >> 28) & 0x0F) === 10) {
                /*  case 1: symbolic link  */
                const target = zip.readFile(entry).toString()
                await fs.promises.symlink(target, filePath)
                if (os.platform() === "darwin")
                    await fs.promises.lchmod(filePath, (entry.attr >> 16) & 0x1ff)
            }
            else if (!entry.isDirectory) {
                /*  case 2: regular file  */
                const data = zip.readFile(entry)
                await fs.promises.writeFile(filePath, data, { encoding: null })
                await fs.promises.chmod(filePath, (entry.attr >> 16) & 0x1ff)
            }
        }
        this.options.progress("extracting update helper distribution", 1.0)
        tmpfile.removeCallback()

        /*  final sanity check  */
        let cli
        if (this.sys === "win")
            cli = path.join(tmpdir.name, "update-helper-cli-win-x64.exe")
        else if (this.sys === "mac")
            cli = path.join(tmpdir.name, "update-helper-cli-mac-x64")
        else if (this.sys === "lnx")
            cli = path.join(tmpdir.name, "update-helper-cli-lnx-x64")
        const accessible = await fs.promises.access(cli, fs.constants.F_OK | fs.constants.R_OK)
            .then(() => true).catch(() => false)
        if (!accessible)
            throw new Error("cannot find CLI binary in downloaded content")

        /*  pass-through execution to CLI  */
        let args = []
        if (this.options.kill > 0)
            args = args.concat([ "--kill", this.options.kill ])
        if (this.options.wait > 0)
            args = args.concat([ "--wait", this.options.wait ])
        if (this.options.rename)
            args.push("--rename")
        args = args.concat([ "--source", this.options.source ])
        args = args.concat([ "--target", this.options.target ])
        if (this.options.cleanup !== "")
            args = args.concat([ "--cleanup", this.options.cleanup ])
        if (this.options.execute !== "")
            args = args.concat([ "--execute", this.options.execute ])
        if (this.options.open !== "")
            args = args.concat([ "--open", this.options.open ])
        this.options.progress("executing CLI binary", 0.0)
        const proc = await execa(cli, args, {
            stdio:    [ "ignore", "ignore", "ignore" ],
            detached: true,
            env: {
                UPDATE_HELPER_CLEANUP_DIR: tmpdir.name
            }
        })
        proc.unref()

        /*  await to be killed by CLI in case we are the target (as expected)  */
        if (this.options.kill > 0 && this.options.kill === process.pid)
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000))
    }

    /*  perform the cleanup after upgrading  */
    async cleanup () {
        const cleanup = process.env.UPDATE_HELPER_CLEANUP_DIR
        if (typeof cleanup === "string" && cleanup !== "") {
            /*  cleanup environment  */
            delete process.env.UPDATE_HELPER_CLEANUP_DIR

            /*  final sanity check  */
            let cli
            if (this.sys === "win")
                cli = path.join(cleanup, "update-helper-cli-win-x64.exe")
            else if (this.sys === "mac")
                cli = path.join(cleanup, "update-helper-cli-mac-x64")
            else if (this.sys === "lnx")
                cli = path.join(cleanup, "update-helper-cli-lnx-x64")
            const accessible = await fs.promises.access(cli, fs.constants.F_OK | fs.constants.R_OK)
                .then(() => true).catch(() => false)
            if (!accessible)
                throw new Error("cannot find CLI binary in cleanup directory")

            /*  perform cleanup  */
            try {
                await fs.promises.unlink(cli)
                await fs.promises.unlink(cleanup)
            }
            catch (ex) {
                /*  NOP  */
            }
        }
    }
}

module.exports = UpdateHelper

