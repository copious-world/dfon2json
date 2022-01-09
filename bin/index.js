#! /usr/bin/env node

const path = require('path')
const fs = require('fs')
const yargs = require("yargs");
const utils = require('./utils.js')
const df2j = require('../scripts/dfon2json')
const out_js = require('../scripts/output_javascript')


// 	// ThinLTO   ... keep track...
// https://www.lazutkin.com/blog/2014/05/18/unification-for-js/
// https://github.com/bramstein/junify

async function my_main_prog() {
    let conf_path = "dfon.conf"
    let cext = path.extname(conf_path)
    if ( cext !== '.conf' ) {
        console.log(`configuration file: ${conf_path} does not have extentions '.conf'`)
        console.log("exiting")
        process.exit(-1)
    }

    let conf = {}
    try {
        conf = fs.readFileSync(conf_path).toString()
        conf = JSON.parse(conf)
    } catch (e) {
        console.error(e)
        process.exit(-1)
    }

    const usage = "\nUsage: dfon2l <dfon file> Type definition file";

    const options = yargs  
        .usage(usage)  
        .option("j", { alias:"javascript", describe: "Translate to javascript.", type: "boolean", demandOption: false })                                                                                                    
        .help(true)  
        .argv;

    if ( (yargs.argv.j == true) || (yargs.argv.javascript == true) ){  
        let file = yargs.argv._[0];
        out_js.output_file(file)
        return
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    //
    if ( yargs.argv._[0] == null ) {  
        utils.showHelp();  
        return
    }
        
  
    if( yargs.argv._[0] )  {
        let file = yargs.argv._[0];
        //parsing the language specified to the ISO-639-1 code.
        df2j.do_conversion(conf,file);
    }
}

/*




*/

my_main_prog()