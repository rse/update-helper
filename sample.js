
const fs           = require("fs")
const path         = require("path")
const UpdateHelper = require(".")

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

