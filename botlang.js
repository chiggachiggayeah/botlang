'use strict'

// TODO
// [x] put state-touching into specific functions
// [x] have a program level function
// [x] do a few tests (very cursory)
// [] integrate with chatblog
// [] validate args function
// [] enforce spec
// [] entity capture

// SPEC
// -convos must have a start address otherwise we pick the first block
// -addresses can't conflict
// -address must EXIST
// -keys have to be unique
// -can only have one address
// -every output must have a default (if it has replies)
// Possible features:
// a hint tag
// what about conversation loops? -> could happen
// have a general catch for replies (*, regex)
// END SPEC

var fs = require('fs');
var os = require('os');
// command line options

// end command line options

// TOKENS
const WS = "WS";
const TXT = "TXT";
const OBRKT = "OBRKT";
const CBRKT = "CBRKT";
const CONV = "CONV";
const OUTP = "OUTP";
const INP = "INP";
const ADDR = "ADDR";
const COMMA = "COMMA";
const ARROW = "ARROW";
const ERROR = "ERROR";
const BKTK = "BKTK";
const ODFLT = "ODFLT";
const CDFLT = "CDFLT";
// END TOKENS

function isWhitespace(c){
  var r = /\s/;
  return r.test(c);
}

function isChar(c){
  var r = new RegExp("[a-zA-Z]|\\?|\\.|\\:|\\!|\\;|\\'|\\*");
  return r.test(c)
}

// otherwise you assume a symbol

// just call different functions instead of maintaining
// a state reference
// could get stale really easily
// should put this in a scan method

function scanStream(stream, init, cb){
  var rep = [];
  var ch;
  var buffer = [init]
  while(ch = buffer.length === 1 ? buffer[0] : stream.read(1)){
    if(ch === buffer[0]) buffer = []; // unset buffer if reading a previous token
    scan();
  }
  cb(rep);

  // SCAN FUNCTIONS //<-- could really be refactored, not very DRY
  function scan(){
    var t;
    if(isWhitespace(ch)){
      t = scanWhitespace(buffer);
      buffer = [];
    } else if(isChar(ch)){
      t = scanText(buffer);
      buffer = [];
    } else {
      t = scanSymbol(buffer);
      buffer = [];
    }
    buffer.push(t);
  }

  function scanWhitespace(b){
    var buf = b;
    buf.push(ch);
    var c;
    while(c = stream.read(1)){
      if(c === null){
        break;
      } else if(!isWhitespace(c)){
        break;
      } else {
        // whitespace
        buf.push(c);
      }
    }
    var lit = buf.join("");
    rep.push([WS, lit]);
    return c; // return the non-whitespace char
  }

  function scanText(b){
    var buf = b;
    buf.push(ch);
    var c;
    while(c = stream.read(1)){
      if(c === null){
        break;
      } else if(!isChar(c)){
        break;
      } else {
        // char
        buf.push(c);
      }
    }
    var lit = buf.join("");
    rep.push([TXT, lit]);
    return c;
  }

  // for symbols and such
  function scanSymbol(b){
    var buf = b;
    buf.push(ch);
    var c;
    while(c = stream.read(1)){
      if(c === null){
        break;
      } else if(isWhitespace(c) || isChar(c)){
        break;
      } else {
        buf.push(c);
      };
    };
    var lit = buf.join("");
    switch(lit){
      case "---":
        rep.push([CONV, lit]);
        break;
      case "<<<":
        rep.push([INP, lit]);
        break;
      case ">>>":
        rep.push([OUTP, lit]);
        break;
      case "@@":
        rep.push([ADDR, lit]);
        break;
      case "[[":
        rep.push([OBRKT, lit]);
        break;
      case "]]":
        rep.push([CBRKT, lit]);
        break;
      case "((":
        rep.push([ODFLT, lit]);
        break;
      case "))":
        rep.push([CDFLT, lit]);
        break;
      case ",":
        rep.push([COMMA, lit]);
        break;
      case "->":
        rep.push([ARROW, lit]);
        break;
      case "`":
        rep.push([BKTK, lit]);
        break;
      case os.EOF:
        break;
      default:
        throw Error("Error while parsing: " + lit);
        break
    };
    return c;
  }
  // END SCAN FUNCTIONS
}

// then you'll have the parser for semantics

function botlangLexer(file,cb){
  var output;
  var s = fs.createReadStream(file, {
    flags: 'r',
    encoding: 'utf8',
    autoClose: true
  });
  s.on('readable', function(){
    var initial;
    if(initial = s.read(1)){
      scanStream(s, initial, cb);
    }
  });
}

// don't need this function anymore
function check(){
  console.log("check");
}

function Parser(rep){
  console.log(rep);
  // each question should probably have
  // an identifier
  var _ids = [];

  const CATCHPHRASE = "REPLY";
  const TRIGGER = "TRIGGER";
  const DESTINATION = "DESTINATION";
  const ADDRESS = "ADDRESS";
  const OUTPUT = "OUTPUT";
  const DEFAULT = "DEFAULT";
  const STARTPHRASE = "STARTPHRASE";
  const RESPONSE = "RESPONSE";
  const END = "END";
  // text

  var convs = {};
  // will need state of some sort
  // TXT can be a trigger, reply
  var sym;
  var repCopy = rep.slice();

  // STATE FUNCTIONS
  // new reply
  function newInput(){
    var conv = convs[_ids.slice(-1)[0]];
    // should access consistently
    var question = conv["questions"].slice(-1)[0];
    var newRep = {};
    newRep.cphrases = [];
    newRep.response = [];
    if(!question.replies){
      question.replies = [newRep];
    } else {
      question.replies.push(newRep);
    };
    return question.replies.slice(-1)[0];
  };

  // have to end old output
  // new question
  function newOutput(){
    var conv = convs[_ids.slice(-1)[0]];
    var newQ = {};
    // init the output and default
    newQ.output = [];
    newQ.default = [];
    if(!conv.questions){
      conv.questions = [newQ];
    } else {
      conv.questions.push(newQ);
    };
    return conv.questions.slice(-1)[0];
  };

  // generate new id and return
  // function newQuestion(){};

  // generate new id and return
  function newConv(){
    const newId = Symbol();
    _ids.push(newId);
    var newConv = {};
    newConv.convTrigger = [];
    newConv.addresses = [];
    convs[newId] = newConv;
    return newId;
  }
  // END STATE FUNCTIONS

  // what is the point of this function exactly?
  function nextSym(){
    sym = repCopy.shift();
  }

  function accept(el){
    return el === sym[0];
  };

  // should throw a better Error
  // depending on what you've given it
  function expect(el, purpose){
    if(accept(el)){
      consume(purpose);
      nextSym();
      return true;
    } else {
      parseError("unexpected symbol");
    }
  };
  // VALIDATION FUNCTIONS
  // actually replies just get compiled to regex right?
  // so it should be sufficent to restrict what we consider
  // characters
  function validateReplies(replies){
    for(let i in replies){
      if(replies[i] === "*"){
        if(replies.length != 1){
          throw Error("invalid reply arguments:" + replies);
        }
      }
    }
  };
  // END VALIDATION FUNCTIONS
  function consume(purpose){
    // latest conv object
    var conv = convs[_ids.slice(-1)[0]];
    // latest question
    if(purpose != TRIGGER && purpose != null){
      var question = conv["questions"].slice(-1)[0];
    }
    switch(purpose){
      // content of latest input's latest reply
      // this is the catchPhrase
      case CATCHPHRASE:
        // kind of ugly
        question.replies.slice(-1)[0].cphrases.push(sym[1]);
        break;
      // latest conv's trigger
      // could be multiple
      case TRIGGER:
        conv.convTrigger.push(sym[1]);
        break;
      // destination of latest input
      // added to reply
      case DESTINATION:
        question.replies.slice(-1)[0].destination = sym[1];
        break;
      case ADDRESS:
        question.address = sym[1];
        conv.addresses.push(sym[1]);
        break;
      // can only differentiate between question and
      // plain output after the fact
      case OUTPUT:
        // add to question output
        question.output.push(sym[1]);
        break;
      case DEFAULT:
        question.default.push(sym[1]);
        break;
      case RESPONSE:
        // add to question reply response TODO
        question.replies.slice(-1)[0].response.push(sym[1]);
        break;
      case END:
        if(conv.addresses.indexOf("start") === -1) throw Error("No start address");
        break
    };

  };
  function cleanOutput(purpose){
    var conv = convs[_ids.slice(-1)[0]];
    // console.log(JSON.stringify(conv));
    if(purpose === OUTPUT){
      var lastOutput = conv.questions.slice(-1)[0].output;
      conv.questions.slice(-1)[0].output = lastOutput.join(" ");
    } else if(purpose === DEFAULT){
      var lastDefault = conv.questions.slice(-1)[0].default;
      conv.questions.slice(-1)[0].default = lastDefault.join(" ");
    } else if(purpose === RESPONSE){
      var lastResponse = conv.questions.slice(-1)[0].replies.slice(-1)[0].response;
      conv.questions.slice(-1)[0].replies.slice(-1)[0].response = lastResponse.join(" ");
    }
  };
  function parseError(phrase){
    throw new Error(phrase);
  };
  // program level traversal function
  function program(){
    while(sym && accept(CONV)){
      convo();
      while(sym && accept(WS)){
        nextSym();
      };
    };
    // console.log();
    return [_ids,convs];
  };
  // this would be contained in a larger structure
  // return a js object
  function convo(){
    // will later assign this to a different object
    // with the triggers as the thing
    if(accept(CONV)){
      newConv(); //<-- call new conv
      nextSym();
      expect(WS);
      // call args
      args(TRIGGER);
      // might have ouput, might not
      // what about whitespace? while whitespace ...

      // prompt or plain output
      body(); // body ends by checking for closing conv
      // closing conv
      expect(CONV, END);
    } else {
      parseError("expected CONV tag");
    }
  };
  // validate args function?
  function args(purpose){
    if(accept(OBRKT)){
      nextSym();
      // comma or close
      list(purpose);
      if(accept(CBRKT)){
        nextSym();
        expect(WS);
      } else {
        parseError("expected CBRKT tag");
      }
    } else {
      parseError("expected OBRKT tag");
    };

    function list(purpose){
      expect(TXT, purpose);
      while(accept(COMMA)){
        nextSym();
        expect(TXT, purpose);
      };
    };
  };

  function body(){
    // this is how you'll consume an input/ouput block
    // how do I capture these values?
    // while not accept '---'

    while(!accept(CONV)){
      // search for block
      eatWS();
      // consume block
      block();
    };
    // build the conv object
    // will also have to check that addresses are OK

    function block(){
      // output
      // some number of inputs (0 or more)
      if(accept(OUTP)){
        // addr and text
        newOutput();
        nextSym();
        expect(WS);
        // then get replies
        // consume address if there
        if(accept(ADDR)){
          nextSym();
          expect(TXT, ADDRESS);
          expect(WS);
        };
        if(accept(ODFLT)){
          expect(ODFLT);
          textBlock(DEFAULT);
          expect(CDFLT);
          expect(WS);
        };
        textBlock(OUTPUT);
        expect(OUTP); // closing output
        // consume replies
        eatReplies();
      } else {
        parseError("expecting output tag");
      }
    };

    // function for the output and input
    // AUX FUNCTION
    function eatWS(){
      while(accept(WS)){
        nextSym();
      };
    };

    function textBlock(purpose){
      while(accept(WS) || accept(TXT) || accept(COMMA)){
        // this is pretty hacky
        // purpose is not necessarily output
        if(accept(TXT)){
          expect(TXT, purpose);
        } else {
          nextSym();
        }
      };
      // clean the text
      cleanOutput(purpose);
    };
    function eatReplies(){
      // need to stop if you're at the end or
      // you've hit another output section
      while(!accept(OUTP) && !accept(CONV)){
        // --> do this over and over
        // optional whitespace
        // inp
        // args
        // ws
        // arrow
        // ws
        // txt
        // ws
        // inp
        // ---
        eatWS();
        if(accept(INP)){
          newInput();
          nextSym();
          expect(WS);
          args(CATCHPHRASE); // trying to make the catchPhrase
          expect(ARROW);
          expect(WS);
          // TXT or BKTK
          if(accept(BKTK)){
            // expect BKTK
            expect(BKTK); //this just informs the purpose
            // eat text block
            textBlock(RESPONSE);
            expect(BKTK);
          } else {
            expect(TXT, DESTINATION);
          };
          expect(WS);
          expect(INP);
        }
      }
    }
    // END AUX FUNCTIONS
  }; //<-- end body tag

  return {
    parse: function(){
      nextSym();
      var result = program();
      console.log(JSON.stringify(result[1]));
      return result;
    }
  }
}

// make this take params
// export
// botlangLexer("botlang", function(rep){
//   var parser = new Parser(rep);
//   parser.parse();
// });

module.exports = {
  Lexer: botlangLexer,
  Parser: Parser
}
