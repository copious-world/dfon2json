
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



function node_style_output(type_name,fields,setters_getters,checker_setup,def) {
    let exporter = `module.exports.${type_name} = ${type_name}`
    //
    let def_lines = ""
    if ( (def.role === "base") && (def.inherit === "none") ) {
        ///
        def_lines = 
`class ${type_name} {
    constructor() {
        this._checkers = {}
        ${fields}
        //
${checker_setup}
    }
    //
    ${setters_getters}
}
${exporter}
`

    } else {
        let inherit_class = capitalizeFirstLetter(def.inherit)
        //
        let remote_or_local = ""
        if ( !(def.parent_remote) ) remote_or_local = "./"
        let importer = `const {${inherit_class}} = require('${remote_or_local}${def.inherit}')`

        def_lines = 
`
${importer}
//
class ${type_name} extends ${inherit_class} {
    constructor() {
        super()
        ${fields}
        //
${checker_setup}
    }
    //
    ${setters_getters}
}
//
${exporter}
`
    //
    }

    return def_lines
}           


function module_style_output(type_name,fields,setters_getters,checker_setup,def) {
    let def_lines = ""
    if ( (def.role === "base") && (def.inherit === "none") ) {
        def_lines = 
`export class ${type_name} {
    constructor() {
        this._checkers = {}
        ${fields}
        //
${checker_setup}
    }
    //
    ${setters_getters}
}
`
    } else {
        let inherit_class = capitalizeFirstLetter(def.inherit)
        //
        let importer = `import {${inherit_class}} from './${def.inherit}.mjs'`

        def_lines = 
`
${importer}
//
export class ${type_name} extends ${inherit_class} {
    constructor() {
        super()
        ${fields}
        //
${checker_setup}
    }
    //
    ${setters_getters}
}
//
`
    }
    //
    return def_lines
}




function array_membership_funs(fname,tspec_array) {
let input = `
    push_${fname}(val) {
        this._${fname}.push(val)
    }

    pop_${fname}() {
        return this._${fname}.pop()
    }
`
    return input
}

function struct_membership_funs(fname,tspec_array) {
    let input = `
    set_${fname}(key,val) {
        this._${fname}[key] = val
    }

    get_${fname}(key) {
        return this._${fname}[key]
    }

    del_${fname}(key) {
        if ( this._${fname}[key] !== undefined ) {
            delete this._${fname}[key]
            return true
        }
        return false
    }
`
    return input
}


function build_all_fields_setter(fields,def) {
    //
    let field_list_list = Object.keys(fields)
    let field_list = field_list_list.join(",")
    let field_sets_list = field_list_list.map(fld => {
        let checker = `\t\tif ( this.type_check('${fld}',${fld}) ) { `
        let setter = `this._${fld} = ${fld} }`
        return (checker + setter)
    })

    let field_sets = field_sets_list.join('\n')
    //
    let parameter_method = `
    set_all(${field_list}) {
${field_sets}
    }
`
    return parameter_method
}

function build_from_map_setter(fields,def) {

    let map_method = `
    type_check(key,value) {
        let truthy_check = this._checkers[key]
        return truthy_check(value)
    }
    //
    set_from_map(map_obj) {
        for ( let mky in map_obj ) {
            let ky = '_' + mky
            if ( ky in this._checkers ) {
                let value = map_obj[ky]
                if ( this.type_check(mky,value) ) {
                    self[ky] = value
                }
            }
        }
    }
`
    return map_method
}






function output_file(json_file,target) {
    //
    console.log("ARGS",json_file)
    //
    let ext = path.extname(json_file)
    if ( ext !== '.json' ) {
        console.log(`${json_file} does not have extentions '.json'`)
        console.log("exiting")
        process.exit(-1)
    }
    
    let target_runner = 'node'
    
    let alt_target = target
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
            return `this._${fld} = ${initializer}`
        })
        let fields = field_inits.join('\n\t\t')
        //

        let setters_getters = ""
        let checker_setup = ""
        let setter_getter_list = []
        let checker_setup_list = []
        //
        for ( let fname in def.fields ) {
            //
            let type_spec = def.fields[fname]
            let backup_type_spec = false
            if ( typeof type_spec !== 'string' ) {
                if ( Array.isArray(type_spec) ) {
                    backup_type_spec = type_spec
                    type_spec = JSON.stringify(type_spec) // for now
                } else {
                    backup_type_spec = type_spec
                    type_spec = JSON.stringify(type_spec) // for now
                }
            }

            let type_check_function = "(val) => { return true }"
            let type_check_map_line = `\t\tthis._checkers["${fname}"] = ${type_check_function}`  // put in the type checking code
            //
            checker_setup_list.push(type_check_map_line)

            let sg = `
    set ${fname}(val) {
        // typecheck ${type_spec}
        this._${fname} = val
        //
    }

    get ${fname}() {
        return this._${fname}
    }
`


            if ( backup_type_spec  && (typeof backup_type_spec !== 'string') ) {
                if ( Array.isArray(backup_type_spec) ) {
                    sg += "\n" + array_membership_funs(fname,backup_type_spec)
                } else {
                    sg += "\n" + struct_membership_funs(fname,backup_type_spec)
                }
            }
            setter_getter_list.push(sg)
            

        }

        checker_setup = checker_setup_list.join("\n")

        let set_all_method = build_all_fields_setter(def.fields,def)
        setter_getter_list.unshift(set_all_method)
        let set_from_map = build_from_map_setter(def.fields,def)
        setter_getter_list.unshift(set_from_map)
        //
        setters_getters = setter_getter_list.join("\n")

        switch ( target_runner ) {
            case "node" : {
                def_lines = node_style_output(type_name,fields,setters_getters,checker_setup,def)
                break;
            }
            case "module" : {
                def_lines = module_style_output(type_name,fields,setters_getters,checker_setup,def)
                break;
            }
            default: {
                break;
            }
        }


    }

    let file_name = ""
    switch ( target_runner ) {
        case "node" : {
            file_name = def.typename + '.js'
            break;
        }
        case "module" : {
            file_name = def.typename + '.mjs'
            break;
        }
        default: {
            break;
        }
    }


    fs.writeFileSync(file_name,def_lines)
    
}



module.exports.output_file = output_file