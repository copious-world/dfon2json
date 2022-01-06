
const fs = require('fs')
const path = require('path')



const targets_OK = ['node', "module", "browser"]


function init_of_field(fld) {
    if ( typeof fld === "string" ) {
        return `""`
    }
    if ( typeof fld === "object" ) {
        if ( Array.isArray(fld) ) {
            return "[]"
        } else {
            return "{}"
        }
    }

    return "false"
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

let identifierRegEX = new RegExp('^[_a-zA-Z][_a-zA-Z0-9]{0,30}$')
function bad_chars_in_file_name(type_name) {
    if ( identifierRegEX.test(type_name) ) return false
    return true
}


let json_file = process.argv[2]
console.log("ARGS",json_file)

let ext = path.extname(json_file)
if ( ext !== '.json' ) {
    console.log(`${json_file} does not have extentions '.json'`)
    console.log("exiting")
    process.exit(-1)
}

let target_runner = 'node'

let alt_target = process.argv[3]
if ( alt_target !== undefined ) {
    if ( targets_OK.indexOf(alt_target) ) {
        target_runner = alt_target
    }
}
console.log("output file for system: " + target_runner)

let data = fs.readFileSync(json_file).toString()

let def = JSON.parse(data)

let def_lines = ""
let type_name = def.typename
if ( type_name === undefined || type_name.length < 2 || bad_chars_in_file_name(type_name) ) {
    console.log("typename is not correct")
    if ( type_name === undefined ) {
        console.log("typename is undefined")
    } else {
        console.log(`typename ${type_name}`)
    }
    console.log("exiting...")
    process.exit(-1)
}
//
if ( def.fields ) {
    //
    type_name = capitalizeFirstLetter(type_name)
    //
    let fields_array = Object.keys(def.fields)
    let field_inits = fields_array.map(fld => {
        let initializer = init_of_field(def.fields[fld])
        return `this.${fld} = ${initializer}`
    })
    let fields = field_inits.join('\n\t\t')
    //
    let exporter = `module.exports.${type_name} = ${type_name}`

    //
    if ( (def.role === "base") && (def.inherit === "none") ) {
        def_lines = 
`class ${type_name} {
    constructor() {
        ${fields}
    }
}
${exporter}
`
    } else {
        let inherit_class = capitalizeFirstLetter(def.inherit)
        //
        let importer = `const ${inherit_class} = require('${def.inherit}')`
        if ( target_runner !== 'node' ) {
            importer = "other guy"
        }

        let exporter = `module.exports.${type_name} = ${type_name}`

        def_lines = 
`
${importer}
//
class ${type_name} extends ${inherit_class} {
    constructor() {
        super()
        ${fields}
    }
}
//
${exporter}
`
    //
    }
}

// 
console.log("--------------------------------")

fs.writeFileSync(def.typename + '.js',def_lines)