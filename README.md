# dfon2json

**DFON** :: **D**efinition **F**ormat **O**bject **N**otation to **JSON** along with code for generating code in other selected programming languages.

## CLI Tool

The code in this repository can be installed with global scope by means of `npm install .`. The installation makes a command line tool, ***dfon2l***, available for translating files formatted in ***dfon***. *(pronounce it dfon to el ...  not defon to one)* The tool may also be used to tranlate the **JSON** formatted output into class definitions (or object equivalents) in other languages.

**Example:**

```
dfon2l def-link-package.dfon
```

The above command tells the program to read the **dfon** file and output its contents in the **JSON** format to files in a cusomtized directory. The user may customize which directory by editing a configuration file in the director of operation.

That is, `dfon2l` reads a configuration file in the working directory of the terminal. The file has to be named `dfon.conf`. An example configuration, the contents of a **dfon.conf** file, follows:

```
{
    "output_dir" : "./defs"
}

```

In order to tranlate the JSON type formats into a supported language, invoke `dfon2l` with a flag and the name of a file to be used as input.

**Example:**

```
dfon2l -j defs/def-link_package.json

```

### cli tool: <u>Purpose of Operations</u>

* **the basic command** `dfon2l <dfon file>`

>> For the most part this invocation takes a format not requiring certain punctuation and adds the puctuation. There is punctuation in the **dfon** format (explained below), but there are fewer quotes and commas than in the JSON format.
>> 
>> Besides turning the format into **JSON**, the command checks that syntax of the file in order to ensure that valid type definitions have been made. It is hoped that checking the types will prevent downstream failure for language generation and project code use.

* **the translation command** `dfon2l -<language specific flag> <json file>`

>> This invocation takes a JSON files containing type definitions and translates it to a useable module (component) in a target programming languages. For example, `dfon2l ` will tranlate the following type file into a class definition file for use with node.js (follows after):

```
{
	"typename" : "link_package",
	"fields" : {
	    "presentation" : "<string|<media-specifier>>",
	    "links" : ["<string|<URL>>"],
	    "link_map" : { "<token>" : "<string|<URL>>" },
	    "reverse_link_map" : { "<string|<URL>>" : "<token>" }
	},
	"inherit" : "blog_type",
	"role" : "impl"
}
```

Translates to the following:

```
const Blog_type = require('blog_type')
//
class Link_package extends Blog_type {
    constructor() {
        super()
        this.presentation = ""
		this.links = []
		this.link_map = {}
		this.reverse_link_map = {}
    }
}
//
module.exports.Link_package = Link_package

```

The actual output is more detailed. More will be explained in the following sections.

## Type Specification Language
 
The format `dfon` is a line delimited language or secifying abstract data types.
 
**<u>This language is limited in scope</u>:** This language only concerns itself with static type definition. It does not utilize any means of specifying operational language. Instead, it generates notation that may be use to direct language generation tools to include code for type checking in either compilation phases or runtime phases.

This language does not use white space to define scope. It uses character delimiters found in popuplar block style languages.


### _Type Specification File_

The tool reads in one file at a time. But, each file may have any number of type definitions. 

Each type definition is expressed in a type definition block. The tool, `dfon2l` will check for a ***start of block*** symbol: `Def:>`. The symbol has to start each block. The tool will throw an error if none are present of if it finds repetitions of control fields which may be taken to mean that the `Def:>` is missing before the start of another block.


### _Type Specification Block_

Each ***type*** being specified occurs in a ***type description block.***

Each block starts with peculiar syntax, `Def:>`. The end of a block is found at the place the next block begins or at the end of file.

* The first line of a ***type description block*** provides a place for directives having to do with the file output. 

* The remaining lines are key value pairs. Some values may be brace `{}` delimited blocks containing key value pairs.

Top level fields control the type definition. Nested blocks fields define the type definition of objects.

Here is an example:

```
Def:> file(def-${typename})       // def-link_package.json
typename : link_package
fields : #{
    presentation : <string|<media-specifier>>
    links : [<string|<URL>>]
    link_map : { <token> : <string|<URL>> }             // A token provides an binding hint... instantiators use for injesting a link package
    reverse_link_map : { <string|<URL>> : <token> }     // link package managers may search for a token in a binding given a link as a key...
}
inherit : blog_type
role : impl

```

The first line sets a format for the output file name.

The next line, the first top level field, names the type. This type is named `link_package`.

The second top level field (line 3) has a nested block as its value. These are the **fields** that will occur in a final language. The nested fields have a peculiar syntax which is carried through to the target language generation.

The third top level field, **inherit** says that this type descends from another type, `blog_type`.

The last top level field indicates that the class will be an implementation  (not an abstract class).

### _Field Definitions_

In the example above, the reader may have noticed the **fields" field with a value being a nested block.

Each field specifies a field of a final class object (or structure or other) to be rendered in a final target language. The syntax in the fields indicates how the programmatic types will be handled in either compilation or runtime checking.

The name value pairs in the **fields** block fields (one per line) specify the **name** of the field, which will occur for use in the program, and the  **value** of the field, which will be a type to which data occupying the value in the program must conform. So, each **name** is a program field name. Each **value** us a type description of a program value.

We may refer to these values as **type specifications**.

In the most basic cases, the type specification will name a machine consonant type for a value. That is it will name a type that the traget programming language knows how to put into machine registers.

Otherwise, the type specification will refer to types that may be use to check the format of data before it is introduced into procedures that expect certain formats.

### _Type Specifications_

Each type specification within the **dfon** file conforms to a syntax. There are container types and there are previously defined types (***known types***).

Here are two container types:

* `[]` - This indicates an array or list (iterable). 

* `{}` - This indicates a map container (hash map).

There is a modifiable data chunk type or known and modifiable type reference:

* `<>` - Names a known type and may have modifications

#### []

The iterable type will be rendered as an array or list in target languages. A single type specifiation and other control information may be found within the delimiters. One type specification indicates the types of content that will be stored in the iterable data structure. 

In general: `[ <known type> ]`

#### {}

The map type indicates the types of key-value pairs that will be stored in a table appropriate for hashing, binary search, etc.

In general: `{ <known type as key> : <known type as value> }`


#### <>

This syntax indicates that a known type is being specified, and may or may not be modified by furhter filtering requirements.

There are two basic forms:

* `<known type name>`
* `<known type name | modifier list>`

When the system checks types, it checks that the type exists in a global lookup system. Given the type is known, it may be left as is and used to direct the importation data format checking methods into the target language code. Or, more modifiers may be added.

If more modifiers are added, they have to be specified in a list on the rest of the line following the Sheff stroke `|`. 

##### modifier list :: ranges, subtypes, patterns, functions

A modifier list is a list of known types and/or range specifiers and/or condition checking functions and/or match patterns.

When the file **dfon** file is being translated, `dfon2l` checks that the modifier may be applied to the known type specified immediately following the first `<`.

###### ranges

A range may supplied for numbers or string lengths. A string may be of minimal length (not less than zero). It may be as long as available memory. For example, if `[5,100]` is a range for the length of a string, final target code should check that a string no shorter than five characters and no longer than a hundred. The code generator should include the check in methods that set the value of the field with such a string. 

Here is an example field definition of a size constrained string:

```
my_field : <string | [1,50]>
```

Here is a string that ranges from zero in lenght to as much as the machine can handle:

```
my_field : <string>
```

Here is an illegal lenght constraint:

```
my_field : <string | [-50,50]>  // A string cannot have negative length
```

Here is a legal integer range:

Here is an illegal lenght constraint:

```
my_int_field : <int | [-50,50]>  // An integer can be signed
```

###### subtypes

A type can defer some checking to a subtype. For example, a string may be constrained to have a patter of characters. If a previously named type checks for a particular format, then it may be called upon to provide the format checking.

For example:
```
<string|<URL>>  // a field will have a value constrained to have a URL format.
```

Similar methods may be used for other types such as integers or floats.

In fact, any named typed may modify another named type as long as it is feasible. It is the job of the `dfon2l` tool to check that the modification is possible. 

###### patterns

Regular Expression patterns may be used to check the format of data while it is in its string state. For instance, numbers may be checked for a format before being interpreted and being subjected to range tests.

Patterns may be applied to strings during compilation and/or runtime, depending on the target language.

###### functions

Functions will only be specified by name. Target languages can provide named functions by refering to implementations provided by the type lookup system.

## Type Lookup System



## Refs

**JSON-DL**<br>
https://w3c.github.io/json-ld-syntax/

**GQL**<br>
https://www.gqlstandards.org/existing-languages
https://opencypher.org/resources/


**IDL**<br>
https://www.omg.org/spec/IDL/4.2/PDF
https://docs.oracle.com/javase/7/docs/technotes/guides/idl/jidlSampleCode.html
https://github.com/RemedyIT/idl2cpp11/tree/master/examples

https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md



