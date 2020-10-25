
update-helper
=============

**Application Update Process Helper Utility**

<p/>
<img src="https://nodei.co/npm/update-helper.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/update-helper.png" alt=""/>

Abstract
--------

<b>Update Helper</b> is a small Application Programming Interface (API)
and corresponding underlying Command-Line Interface (CLI) for updating
an application in an opinionated way.

It is primarily intended to update a <i>packaged</i> Electron
application (consisting of a single <code>.exe</code> or
<code>.app</code> file) under Windows and macOS. The crux in this
scenario is that the application cannot do this itself, as its running
Electron run-time is part of the application bundle and as long as it is
running, it cannot replace itself on the filesystem. Instead, <b>Update
Helper</b> downloads a stand-alone packaged variant of its CLI into
a temporary directory and calls it to kill the application process,
replace the application file and restart the application.

NOTICE: Currently, <b>Update Helper</b> just supports Windows, macOS and
Linux, as the underlying CLI is packaged for those platforms only.

Installation
------------

$ npm install update-helper

Usage
-----

```
const fs           = require("fs")
const path         = require("path")
const UpdateHelper = require("update-helper")

;(async () => {
    /*  write a logfile as we cannot see all outputs on the console  */
    const logfile = path.join(__dirname, "sample.log")
    const log = (msg) =>
        fs.promises.appendFile(logfile, `${msg}\n`, { encoding: "utf8" })

    /*  indicate start  */
    await log(`sample: begin (${process.pid})`)

    /*  instantiate update helper  */
    const uh = new UpdateHelper({
        kill:     process.pid,
        wait:     1000,
        source:   "sample.new.txt",
        target:   "sample.old.txt",
        cleanup:  [],
        execute:  [ ...process.argv.map((arg) => `"${arg}"`), "--restarted" ].join(" "),
        progress: (step, percent) => { log(`sample: download CLI: ${(percent * 100).toFixed(0)}%: ${step}`) }
    })

    /*  dispatch according to arguments  */
    if (process.argv.length === 2) {
        /*  regular start  */
        await fs.promises.writeFile("sample.old.txt", "OLD\n", { encoding: "utf8" })
        await fs.promises.writeFile("sample.new.txt", "NEW\n", { encoding: "utf8" })
        await log("sample: update: begin")
        process.on("SIGINT", async (sig) => {
            await log("sample: update: end (terminated by SIGINT)")
            process.exit(0)
        })
        process.on("SIGTERM", async (sig) => {
            await log("sample: update: end (terminated by SIGTERM)")
            process.exit(0)
        })
        await uh.update()
    }
    else if (process.argv.length === 3 && process.argv[2] === "--restarted") {
        /*  restart after update  */
        await log("sample: cleanup: begin")
        await uh.cleanup()
        await log("sample: cleanup: end")
    }

    /*  indicate end  */
    await log(`sample: end (${process.pid})`)
})()
```

License
-------

Copyright &copy; 2020 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

