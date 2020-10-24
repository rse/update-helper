#!/usr/bin/env node
/*!
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

/*  external requirements  */
const fs      = require("fs")
const path    = require("path")
const yargs   = require("yargs")
const execa   = require("execa")
const open    = require("open")
const copy    = require("@danieldietrich/copy")
const rimraf  = require("rimraf")

;(async () => {
    /*  parse command-line options  */
    const usage =
        "Usage: update-helper-cli" +
        " [-k|--kill <pid>]" +
        " [-w|--wait <ms>]" +
        " [-r|--rename]" +
        " [-s|--source <file>|<directory>]" +
        " [-t|--target <file>|<directory>]" +
        " [-c|--cleanup <file>|<directory>]" +
        " [-e|--execute <file>]" +
        " [-o|--open <file>]"
    const opts = yargs()
        .parserConfiguration({
            "set-placeholder-key": true,
            "halt-at-non-option":  true
        })
        .usage(usage)
        .option("k", {
            alias:    "kill",
            type:     "number",
            describe: "process id to kill",
            default:  0
        })
        .option("w", {
            alias:    "wait",
            type:     "number",
            describe: "milliseconds to wait after kill and before copying source to target",
            default:  0
        })
        .option("r", {
            alias:    "rename",
            type:     "boolean",
            describe: "whether to rename the target before overwrite",
            default:  false
        })
        .option("s", {
            alias:    "source",
            type:     "string",
            describe: "source file or directory",
            default:  ""
        })
        .option("t", {
            alias:    "target",
            type:     "string",
            describe: "target file or directory",
            default:  ""
        })
        .option("c", {
            alias:    "cleanup",
            type:     "array",
            describe: "cleanup file or directory after update",
            default:  []
        })
        .option("e", {
            alias:    "execute",
            type:     "string",
            describe: "execute program after update",
            default:  ""
        })
        .option("o", {
            alias:    "open",
            type:     "string",
            describe: "open program after update",
            default:  ""
        })
        .version(false)
        .help(true)
        .showHelpOnFail(true)
        .strict(true)
        .parse(process.argv.slice(2))
    if (opts._.length !== 0) {
        process.stderr.write(`${usage}\n`)
        process.exit(1)
    }
    if (typeof opts.cleanup === "string")
        opts.cleanup = [ opts.cleanup ]
    if (opts.source === "")
        throw new Error("mandatory source file or directory missing")
    if (opts.target === "")
        throw new Error("mandatory target file or directory missing")

    /*  ensure source is readable  */
    const readable = await fs.promises.access(opts.source, fs.constants.F_OK | fs.constants.R_OK)
        .then(() => true).catch(() => false)
    if (!readable)
        throw new Error(`source "${opts.source}" not readable`)

    /*  ensure target is writeable  */
    const writeable = await fs.promises.access(opts.target, fs.constants.W_OK)
        .then(() => true).catch(() => false)
    if (!writeable)
        throw new Error(`target "${opts.target}" not writeable`)

    /*  optionally kill old program  */
    if (opts.kill > 0)
        process.kill(opts.kill, "SIGTERM")

    /*  optionally wait
        (which usually gives calling application a chance to
        terminate in order to avoid busy files)  */
    if (opts.wait > 0)
        await new Promise((resolve) => setTimeout(resolve, opts.wait))

    /*  optionally rename an existing target  */
    let wasRenamed = false
    if (opts.rename) {
        const exists = await fs.promises.access(opts.target, fs.constants.F_OK)
            .then(() => true).catch(() => false)
        if (exists) {
            await fs.promises.rename(opts.target, path.join(opts.target, ".old"))
            wasRenamed = true
        }
    }

    /*  copy source to target
        (which usually means to replace the calling application executable)  */
    await copy(opts.source, opts.target, {
        overwrite: true
    })

    /*  optionally remove old target  */
    if (wasRenamed) {
        await new Promise((resolve, reject) => {
            rimraf(path.join(opts.target, ".old"), { disableGlob: true }, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  optionally cleanup resources
        (which usually means to remove the source)  */
    for (const resource of opts.cleanup) {
        await new Promise((resolve, reject) => {
            rimraf(resource, { disableGlob: true }, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  optionally execute program
        (which usually execute a particular post-update action)  */
    if (opts.execute !== "") {
        const proc = execa.command(opts.execute, {
            stdio:    [ "ignore", "ignore", "ignore" ],
            detached: true,
            shell:    true
        })
        proc.unref()
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    /*  optionally open program
        (which usually restarts the calling application again)  */
    if (opts.open !== "") {
        await open(opts.open)
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    /*  gracefully terminate  */
    process.exit(0)
})().catch((err) => {
    /*  fatal error  */
    process.stderr.write(`update-helper-cli: ERROR: ${err}\n`)
    process.exit(1)
})

