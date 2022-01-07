

const chalk = require('chalk')

const usage = "\nUsage: tran <lang_name> sentence to be translated";
//const usage = chalk.hex('#83aaff')("\\nUsage: tran <lang\_name> sentence to be translated");

function showHelp() {                                                            
    console.log(usage);  
    console.log('\nOptions:\r')  
    console.log('\t--version\t      ' + 'Show version number.' + '\t\t' + '[boolean]\r')  
    console.log('    -l, --languages\t' + '      ' + 'List all languages.' + '\t\t' + '[boolean]\r')  
    console.log('\t--help\t\t      ' + 'Show help.' + '\t\t\t' + '[boolean]\n')  
}




function showAll(){  
    console.log(chalk.magenta.bold("\nLanguage Name\t\tISO-639-1 Code\n"))  
    for(let [key, value] of languages) {  
            console.log(key + "\\t\\t" + value + "\\n")  
    }  
}


//

module.exports.showHelp = showHelp;
module.exports.showAll = showAll;
