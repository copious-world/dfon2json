// ---- 
const fs = require('fs')
const path = require('path')
const {remove_comments} = require('../utils/comments')


const OPEN_FIELD_LIST_TOKEN = '#{'
const JSON_OPEN_FIELD_LIST_TOKEN = '{'



let identifierRegEX = new RegExp('^[_a-zA-Z][_a-zA-Z0-9]{0,30}$')
function identifier_match(front) {
    return identifierRegEX.test(front)
}


// // // // // // // // // // // // 


const built_in_types_modifiers = {
    "e-mail" : ["string"],
    "URL" :  ["string"],
    "UCWID" :  ["string"],
    "media-specifier" :  ["string"]
}

const built_in_base_types = {
    "char" : 1,
    "utf8" : 2,
    "int" : 3,
    "long" : 4,
    "longer" : 5,
    "float" : 6,
    "double" : 7,
    "complex" : 8,
    "token" : 9,
    "string" : 10
}

const identifier_field_set = {
    "typename" : 1,
    "role" : 1,
    "inherit" : 1
}

function is_id_valued_field(front) {
    let fkey = front.trim()
    if ( identifier_field_set[fkey] !== undefined ) {
        return true
    }
}

function valid_range(range) {
    try {
        let [rmin,rmax] = range.trim().split(',')
        let imin = parseInt(rmin)
        let imax = parseInt(rmax)
        if ( imin < 0 || imax < 0 ) {
            console.error("bad range")
            return false
        }
        if ( imin > imax ) {
            console.error("bad range")
            return false
        }
    } catch (e) {
        return false
    }
    return true
}


function grammar_check_is_identifier_value(value_specifier) {
    let no_print_val = value_specifier.trim()
    return identifier_match(no_print_val)
}

// // // // // // // // // // // // 

function grammar_token_check_included(token,dfon_data) {
    let idx = dfon_data.indexOf(token)
    return ( idx >= 0 )
}


function pop_base_type(type_specifier) {
    let type_s = type_specifier[0] === '<' ? type_specifier.substr(1) : type_specifier
    let base_t = ""
    let n = type_s.length
    let i = 0;
    for (  ;i < n; i++ ) {
        let c = type_s[i]
        if ( c === '|' || c === '>' ) {
            break
        }
        if ( c === ' ' || c === '\t' ) continue
        base_t += c
    }
    base_t = base_t.trim()
    let rest_t = type_s.substr(i+1).trim()
    return [base_t,rest_t]
}

const mod_CHECK = 0;
const mod_MOD_TYPE = 1;
const mod_RANGE_TYPE = 2;

function split_mods(modifier) {
    let mod_list = []
    let n = modifier.length
    let cur_mod = ""
    let state = mod_CHECK
    for ( let i = 0; i < n; i++ ) {
        let c = modifier[i]
        switch ( c ) {
            case "[" : {
                if ( state !== mod_CHECK ) {
                    return false
                }
                state = mod_RANGE_TYPE
                cur_mod = ""
                break;
            }
            case "]" : {
                if ( state !== mod_RANGE_TYPE ) {
                    console.log(cur_mod,"-",modifier.substr(i))
                    return false
                }
                state = mod_CHECK
                mod_list.push([cur_mod,mod_RANGE_TYPE])
                cur_mod = "" 
                break
            }
            case "<" : {
                if ( state !== mod_CHECK ) {
                    console.log(cur_mod,"-",modifier.substr(i))
                    return false
                }
                state = mod_MOD_TYPE
                cur_mod = ""
                break;
            }
            case ">" : {
                if ( state !== mod_MOD_TYPE ) {
                    console.log(cur_mod,"-",modifier.substr(i))
                    return false
                }
                state = mod_CHECK
                mod_list.push([cur_mod,mod_MOD_TYPE])
                cur_mod = ""
                break;
            }
            case "," : {
                if ( state !== mod_RANGE_TYPE ) {
                    console.log(cur_mod,"-",modifier.substr(i))
                    return false
                }
                cur_mod += c;
                break
            }
            default:  {
                cur_mod += c;
                break;
            }
        }
    }
    return mod_list
}


// grammar_check_type_modifiers -- 
//  -- check that the modifier line is well formed. Also (TODO), check the base type may be modified by modifiers
//      -- e.g a length modifier may not be suitable for a float but works for a string
function grammar_check_type_modifiers(base_type,modifier) {
    let mod_list = split_mods(modifier)
    if ( mod_list ) {
        for ( let mod_pair of mod_list ) {
            let [mod,mod_type] = mod_pair
            if ( mod_type === mod_MOD_TYPE ) {
                if ( built_in_types_modifiers[mod] === undefined ) {
                    console.log(`could not find modifier ${mod}`)
                    return false
                }
            } else if ( mod_type === mod_RANGE_TYPE ) {
                if ( !(valid_range(mod)) ) return false
            }
        }
        return true
    }
    return false
}


// grammar_check_type_specification 
//      check that this is well formed and do precurory semantic checking.
function grammar_check_type_specification(type_specifier) {
    //type_specifier
    type_specifier = type_specifier.trim() // just in case... it should already be trimmed
    let c = type_specifier[0]
    switch ( c ) {
        case '<' : {    // handle a type def
            let [base_type,rest] = pop_base_type(type_specifier)
            if ( built_in_base_types[base_type] === undefined ) {
                return false
            }
            if ( rest.length ) {
                let terminator = rest.lastIndexOf('>')
                rest = rest.substr(0,terminator).trim()
                return grammar_check_type_modifiers(base_type,rest)
            }
            return true;
        }
        case '[' : {    // handle an array of type
            let eos = type_specifier.lastIndexOf(']')
            let spec_part = type_specifier.substr(1,eos-1).trim()
            return grammar_check_type_specification(spec_part)
        }
        case '{' : {        // handle a pair of types
            let eos = type_specifier.lastIndexOf('}')
            let spec_part = type_specifier.substr(1,eos-1).trim()
            let [field_type,value_part] = spec_part.split(':')
            let fieldOK = grammar_check_type_specification(field_type.trim())
            let valueOK = grammar_check_type_specification(value_part.trim())
            return (fieldOK && valueOK);
        }
        default: {
            return false        /// all type specifiers must be syntactically obvious strings
        }
    }
}

// // // // 

function grammar_check_line_chars(def_lines,positions,fld_set) {
    // 
    let n = def_lines.length
    let current_open_field_list = false
    for ( let i = 0; i < n; i++ ) {
        let line = def_lines[i]
        line = line.trim()
        if ( line.length === 0 ) continue /// empty lines are not processed
        if ( line[0] === '}' ) {            /// close a field list
            if ( current_open_field_list ) {
                fld_set[`~${current_open_field_list}`] = current_open_field_list
            }
        } else {
            // make sure the line has an identifier before a ':' ... after the ':' only type definitions are the start of type defs is allowed
            let first_colon = line.indexOf(':')
            if ( first_colon < 0 ) {
                console.error(`no ':' found on definition line ${i+1} after start of definition`)
                positions.push(i)
                return false
            }
            let front = line.substr(0,first_colon).trim()
            if ( !(identifier_match(front)) ) {
                console.error(`improper identifier ${front} found on definition line ${i+1} after start of definition`)
                positions.push(i)
                return false
            }

            if ( fld_set[front] !== undefined ) {
                console.error(`duplicate identifier ${front} found on definition line ${i+1} after start of definition`)
                positions.push(i)
                return false
            }

            fld_set[front] = line.substr(first_colon + 1).trim()

            if ( fld_set[front] === OPEN_FIELD_LIST_TOKEN ) {
                fld_set[front] = JSON_OPEN_FIELD_LIST_TOKEN
                current_open_field_list = front
                continue
            }

            if ( is_id_valued_field(front) ) {
                if ( !grammar_check_is_identifier_value(fld_set[front]) ) {
                    console.error(`bad value definition for identifier value field ${front} found on definition line ${i+1} after start of definition: ${fld_set[front]}`)
                    positions.push(i)
                    return false
                }
                continue
            }
            
            if ( !grammar_check_type_specification(fld_set[front]) ) {
                console.error(`bad type definition for field ${front} found on definition line ${i+1} after start of definition: ${fld_set[front]}`)
                positions.push(i)
                return false
            }
        }
    }
    return true
}


//
// the typename has to be on some line at the top level of the def lines
function get_typename(dlines) {
    let tname = "unknown"
    for ( let line of dlines ) {
        line = line.trim()
        if ( line.indexOf("typename") === 0 ) {
            tname = line.substr(line.indexOf(':')+1).trim()
            if ( tname[tname.length-1] === ',' ) {
                tname = tname.substr(0,tname.length-1).trim()
            }
            return tname
        }
    }
    return tname
}

function output_name(out_directive,dlines) {
    //
    let typename = get_typename(dlines)
    let file_name = "unknown"
    let name_def_offset = out_directive.indexOf('file(')
    if ( name_def_offset >= 0 ) {
        let start = out_directive.indexOf('file(') + 5
        let def = out_directive.substr(start)
        def = def.substr(0,def.lastIndexOf(')'))
        file_name = def.replace('${typename}',typename)
    } else {
        console.log("output typename ")
        file_name = typename
    }
    //
    return file_name
}


function right_trim(line) {
    let n = line.length
    while ( --n ) {
        let c = line[n]
        if ( (c !== ' ') && (c !== '\t') ) break;
    }
    line = line.substr(0,n+1)
    return line
}

function last_of(str) {
    let n = str.length - 1
    return str[n]
}


function array_type_quotes(fval) {
    let rline = fval.substr(1)
    let i = rline.lastIndexOf(']')
    let stuff = rline.substr(0,i)
    return ` ["${stuff}"]`
}

function map_type_quotes(fval) {
    if ( fval.length === 0 ) return ""
    let rline = fval.substr(1)
    let i = rline.lastIndexOf('}')
    let stuff = rline.substr(0,i-1)

    let splitter = "> : <"
    if ( stuff.indexOf(splitter) < 0 ) {
        splitter = ">: <"
        if ( stuff.indexOf(splitter) < 0 ) {
            splitter = "> :<"
            if ( stuff.indexOf(splitter) < 0 ) {
                splitter = ">:<"
                if ( stuff.indexOf(splitter) < 0 ) {
                    console.error("map definition without '> : <' pattern")
                    process.exit(0)
                }
            }
        }
    }

    let stuff_parts = stuff.split(splitter)
    stuff_parts = stuff_parts.map(str => str.trim() )
    return ` { "${stuff_parts[0]}>" : "<${stuff_parts[1]}" }`
}


function quoted_field_value(fld_val) {
    if ( fld_val.length === 0 ) return ''
    if ( fld_val === JSON_OPEN_FIELD_LIST_TOKEN ) return (' ' + JSON_OPEN_FIELD_LIST_TOKEN)
    let p = fld_val[0]
    if ( (p === '[') || (p === '{') ) {
        if ( p === '[' ) {
            return(array_type_quotes(fld_val))
        } else {
            return(map_type_quotes(fld_val))
        }

    }
    return ` "${fld_val}"`
}


function commas_at_end(def_lines) {
    let n = def_lines.length
    for ( let i = 0; i < n; i++ ) {
        //
        let line = def_lines[i]
        line = right_trim(line)
        if ( last_of(line) === '{' ) continue
        if ( last_of(line) === '[' ) continue
        //
        if ( i < (n-2) ) {
            let check_line = def_lines[i+1].trim()
            if ( check_line === '}' ) continue
        }
        //
        def_lines[i] = line + ','
    }
    return def_lines
}

function quote_key_vals(def_lines,def_count) {

    let error_lines = []
    let fld_set = {}
    if ( !grammar_check_line_chars(def_lines,error_lines,fld_set) ) {
        throw new Error(`bad characters in start of line at lines [${error_lines}] after start of def # ${def_count}`)
    }

    //console.dir(fld_set)

    let n = def_lines.length
    for ( let i = 0; i < n; i++ ) {
        let line = def_lines[i]
        if ( line.indexOf(':') < 0 ) continue
        let q_line = ""
        let j = 0
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            if ( (c === ' ') || (c === '\t') ) q_line += c
            else break
        }
        q_line += '"'
        let identifier = ""
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            if ( (c !== ' ') && (c !== '\t') ) {
                q_line += c
                identifier += c
            }
            else break
        }
        q_line += '"'
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            q_line += c
            if ( c === ':' ) break
        }

        q_line += quoted_field_value(fld_set[identifier]) // rest_of_line(line.substr(j+1))
        def_lines[i] = q_line
    }
    //
    let last_line = def_lines.pop()
    def_lines = commas_at_end(def_lines)
    def_lines.push(last_line)
    def_lines = def_lines.map(line => '\t' + line)

    let output = `{
${def_lines.join('\n')}
}`
    //
    return output
}


// input a type definition block
// output a JSON format type definition... 
//
function process_defs(def_list) {
    //
    let output_list = []
    let def_count = 0;
    for ( let def of def_list ) {   // on per definition block
        let def_pair = {}
        //
        let def_lines = def.split('\n')                     // the processing is line based,,, and blocks are clearly delimited on lines
        // The first line will have some directives about how to output the definition
        let out_directive = def_lines.shift()
        if ( out_directive.indexOf("file(") < 0) {
            console.log(out_directive)
            out_directive = ""
        }
        // process the output directives to make the file name
        def_pair.filename = output_name(out_directive,def_lines) + '.json'
        //
        // Now Tranlate the block to JSON
        try { 
            def_pair.json = quote_key_vals(def_lines,++def_count)
        } catch (e) {
            console.error(e)
            console.log(`failed to tranlate definition: ${def_pair.filename}`)
            continue
        }
        //
        output_list.push(def_pair)
        //
    }
    if ( output_list.length ) {
        return output_list
    }
console.log("return false")
    return false
}





function do_conversion(conf,dfon_file) {
    //
    let out_dir = conf.output_dir
    if ( out_dir === undefined ) {
        out_dir = "./"
    }
    if ( out_dir.lastIndexOf('/') < out_dir.length - 1) {
        out_dir += '/'
    }
    console.log(`OUTPUT DIR: ${out_dir}`)

    console.log("ARGS",dfon_file)

    let ext = path.extname(dfon_file)
    if ( ext !== '.dfon' ) {
        console.log(`${dfon_file} does not have extentions '.dfon'`)
        console.log("exiting")
        process.exit(-1)
    }

    try {
        //
        let dfon_data = fs.readFileSync(dfon_file).toString()
        try {
            dfon_data = remove_comments(dfon_data)
        } catch (e) {
            console.error("ill formed comments")
            return -1
        }

        //
        if ( !grammar_token_check_included("Def:>",dfon_data) ) {
            console.error("cannot find token:  'Def:>' in input data...")
            return -1
        }
        //
        // Split the file into sections, each one a separate definition
        //
        let def_list = dfon_data.trim().split('Def:')
        def_list = def_list.map(wdef => {
            return wdef.trim()
        })
        // Remove the leading lines, which should be empty but come before the first section. (should happen once)
        while ( def_list[0].length === 0 ) def_list.shift()
        //

        //
        // now each def begins with '>' and each is its own definition section... 
        //
        let output_list = process_defs(def_list)  // output a list of processed definitions
        if ( output_list ) {
            for ( let outp of output_list ) {
                let filename = outp.filename
                let output = outp.json
                fs.writeFileSync(out_dir + filename,output)
            }    
        } else {
            console.log("could not process all definitions")
        }
        //
    } catch(e) {
        console.error(e)
    }


}


module.exports.do_conversion = do_conversion