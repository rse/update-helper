
const fs           = require("fs")
const path         = require("path")
const UpdateHelper = require(".")

;(async () => {
    const logfile = path.resolve(path.join(__dirname, "sample.log"))
    const log = (msg) =>
        fs.promises.appendFile(logfile, `${msg}\n`, { encoding: "utf8" })
    await log("sample start")
    const uh = new UpdateHelper({
        kill:     process.pid,
        wait:     1000,
        elevate:  false,
        source:   path.resolve(path.join(__dirname, "sample.txt.new")),
        target:   path.resolve(path.join(__dirname, "sample.txt")),
        cleanup:  [],
        execute:  [ path.resolve(process.argv[0]), ...process.argv.slice(1).map((arg) => `"${arg}"`), "dummy" ].join(" "),
        progress: (step, percent) => { log(`sample: ${percent * 100}%: ${step}`) }
    })
    if (process.argv.length === 2) {
        await log("sample: update: begin")
        await fs.promises.writeFile("sample.txt", "old", { encoding: "utf8" })
        await fs.promises.writeFile("sample.txt.new", "new", { encoding: "utf8" })
        await uh.update()
        await log("sample: update: end")
    }
    else {
        await log("sample: cleanup: begin")
        await uh.cleanup()
        await log("sample: cleanup: end")
    }
    log("sample end")
})()

