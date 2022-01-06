// ---- 
const fs = require('fs')
const path = require('path')
const {remove_comments} = require('../utils/comments')

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


function array_type_quotes(rline) {
    let i = rline.lastIndexOf(']')
    let stuff = rline.substr(0,i-1)
    return `"${stuff}"]`
}

function map_type_quotes(rline) {
    if ( rline.length === 0 ) return ""
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
    return ` "${stuff_parts[0]}>" : "<${stuff_parts[1]}" }`
}



function rest_of_line(line) {
    let q_line = ""
    let j = 0
    for ( ; j < line.length; j++ ) {
        let c = line[j]
        if ( (c === ' ') || (c === '\t') ) q_line += c
        else break
    }
    let p = line[j]
    if ( (p === '[') || (p === '{') ) {
        q_line += p
        if ( p === '[' ) {
            q_line += array_type_quotes(line.substr(j+1))
        } else {
            q_line += map_type_quotes(line.substr(j+1))
        }

    } else {
        q_line += '"'
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            if ( (c !== ' ') && (c !== '\t') ) q_line += c
            else break
        }
        q_line += '"'

    }
    return q_line
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

function quote_key_vals(def_lines) {
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
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            if ( (c !== ' ') && (c !== '\t') ) q_line += c
            else break
        }
        q_line += '"'
        for ( ; j < line.length; j++ ) {
            let c = line[j]
            q_line += c
            if ( c === ':' ) break
        }
        q_line += rest_of_line(line.substr(j+1))
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



function process_defs(def_list) {
    //
    let output_list = []
    for ( let def of def_list ) {
        let def_pair = {}
        //
        let def_lines = def.split('\n')
        let out_directive = def_lines.shift()
        if ( out_directive.indexOf("file(") < 0) {
            console.log(out_directive)
            out_directive = ""
        }
        def_pair.filename = output_name(out_directive,def_lines) + '.json'
        def_pair.json = quote_key_vals(def_lines)
        //
        output_list.push(def_pair)
    }
    return output_list
}


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

let out_dir = conf.output_dir
if ( out_dir === undefined ) {
    out_dir = "./"
}
if ( out_dir.lastIndexOf('/') < out_dir.length - 1) {
    out_dir += '/'
}
console.log(`OUTPUT DIR: ${out_dir}`)


let dfon_file = process.argv[2]
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
    dfon_data = remove_comments(dfon_data)
    let def_list = dfon_data.trim().split('Def:')
    def_list = def_list.map(wdef => {
        return wdef.trim()
    })
    while ( def_list[0].length === 0 ) def_list.shift()
    //
    let output_list = process_defs(def_list)
    for ( let outp of output_list ) {
        let filename = outp.filename
        let output = outp.json
        fs.writeFileSync(out_dir + filename,output)
    }
    //
} catch(e) {
    console.error(e)
}