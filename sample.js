
const UpdateHelper = require(".")

;(async () => {
    const uh = new UpdateHelper({
        kill:     process.pid,
        wait:     1000,
        source:   "sample.txt.new",
        target:   "sample.txt",
        cleanup:  [],
        execute:  process.argv.map((arg) => `"${arg}"`).join(""),
        progress: (step, percent) => { console.log(`sample: ${percent * 100}%: ${step}\n`) }
    })
    console.log("sample start")
    if (process.argv[2] === "update")
        await uh.update()
    else
        await uh.cleanup()
    console.log("sample end")
})()

