'use strict'

var botlang = require('./botlang.js');
var program = require('commander');
var fs = require('fs');

program
  .version('0.0.1')
  .option('-f, --file [value]', 'File to parse')
  .parse(process.argv)

if(!program.file){
  throw Error("No file to compile specified")
} else {
  botlang.Lexer(program.file, function(rep){
    var parser = new botlang.Parser(rep);
    var payload = parser.parse();
    var _ids = payload[0];
    var convs = payload[1];
    var convoList = _ids.map(function(id){
      return convs[id];
    });
    var JSONcl = JSON.stringify(convoList);
    fs.writeFile("compiled.json", JSONcl, function(err){
      if (err) throw err;
    });
    // console.log(JSON.parse(JSONcl)[0]);
    // for(let i in _ids){
    //   var id = _ids[i];
    //   console.log(JSON.stringify(convs[id]));
    // }
  });
}
