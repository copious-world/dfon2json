


function big_comments_disappear(str) {
    //
    if ( str.indexOf('/*') < 0 ) return str
    //
    let comment_starts = str.split('/*')
    let output = comment_starts.shift()
    //
    while ( comment_starts.length ) {
        let next_part = comment_starts.shift()
        output += '\n' + next_part.substr(next_part.indexOf('*/') + 2)
    }
    //
    return output
}



module.exports.remove_comments = (str) => {
    let lines = str.split('\n')
    let n = lines.length
    for ( let i = 0; i < n; i++ ) {
        let line = lines[i]
        let offset = line.indexOf('//')
        if ( offset >= 0 ) {
            line = line.substr(0,offset)
            lines[i] = line
        }
    }

    let cleansed = lines.join('\n')

    let really_cleansed = big_comments_disappear(cleansed)
    return really_cleansed
}
