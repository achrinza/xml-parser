// SPDX-FileCopyrightText: Copyright 2024 Rifa Achrinza
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-or-later
// SPDX-FileNoticeText: <text>
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License, v. 2.0 are satisfied: GNU General Public License, version 2
// which is available at https://www.gnu.org/licenses/gpl-2.0.html
// </text>
import EventEmitter from 'node:events';
import {ReadableStream} from 'node:stream/web';

/**
 * A lot of these don't do anything yet.
 **/
export interface SAXParserConfig {
  doc: {
    // SAX
    validating: boolean | 'warn',
    namespace: boolean,
    namespacePrefix: boolean,
    
    // Compatibility
    allowElongatedXMLCommentBoundaries: boolean | 'warn',
    allowDoubleHyphensWithinXMLComments: boolean | 'warn',
    normalizeEOL: boolean,
    
    // Security
    elementAttributeLimit: number | null,
    entityExpansionLimit: number | null,
    entityReplacementLimit: number | null,
    maxElementDepth: number | null,
    maxXMLNameLimit: number | null,
  },
  xmlDecl: {
    treatAsRegularPI: boolean | 'warn',
    allowOutOfOrderAttributes: boolean | 'warn',
    allowEncodingMismatch: boolean | 'warn',
    allowVersionMismatch: boolean | 'warn',
  },
  pi: {
    
  },
  dtd: {
    // Security
    maxGeneralEntitySizeLimit: number | null,
    maxParameterEntitySizeLimit: number | null,
    totalEntitySizeLimit: number | null,

    accessExternalDTD: ('all'|'catalog'|'file'|'http'|string)[],
    disallowDoctypeDecl: boolean | null,
    externalGeneralEntities: boolean | null,
    externalParameterEntities: boolean | null,
  },
  xmlSchema: {
    //Security (parser)
    maxOccurLimit: number | null,
    accessExternalSchema: ('all'|'catalog'|'file'|'http'|string)[],
  },
  catalog: {
    accessExternalCatalog: ('all'|'file'|'http')[],
  },
};

/*type DeepPartial<T extends Record<string|number|symbol,any>> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export function saxFeatureToParserConfig(features: Record<SAXParserFeatures, boolean>): DeepPartial<SAXParserConfig> {
  const docConfig: Partial<SAXParserConfig['doc']> = {}
  
  for (const feature in features) {
    switch (feature) {
      case SAXParserFeatures.NAMESPACES:
        docConfig.namespace = features[feature];
        break
      case SAXParserFeatures.NAMESPACE_PREFIXES:
        docConfig.namespacePrefix = features[feature];
        break;
    }
  }

  return config;
}*/

export const DEFAULT_SAX_PARSER_CONFIG: SAXParserConfig = {
  doc: {
    // =======
    // = SAX =
    // =======
    validating: true,
    namespace: true,
    namespacePrefix: false,

    // =================
    // = Compatibility =
    // =================
    allowElongatedXMLCommentBoundaries: false,
    /**
     * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-comments
     * @see https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-comments
     **/
    allowDoubleHyphensWithinXMLComments: true,
    normalizeEOL: true,

    // ============
    // = Security =
    // ============
    elementAttributeLimit: 10000,
    entityExpansionLimit: 64000,
    entityReplacementLimit: 3000000,
    maxElementDepth: 0,
    maxXMLNameLimit: 1000,
  },
  xmlDecl: {
    // =================
    // = Compatibility =
    // =================
    treatAsRegularPI: false,
    allowOutOfOrderAttributes: false,
    allowEncodingMismatch: false,
    allowVersionMismatch: false,
  },
  pi: {
    
  },
  dtd: {
    // ============
    // = Security =
    // ============
    maxGeneralEntitySizeLimit: null,
    maxParameterEntitySizeLimit: 1000000,
    totalEntitySizeLimit: 5e7,

    accessExternalDTD: ['all'],
    disallowDoctypeDecl: true,
    externalGeneralEntities: false,
    externalParameterEntities: false,
  },
  xmlSchema: {
    // ============
    // = Security =
    // ============
    maxOccurLimit: 5000,
    accessExternalSchema: ['all'],
  },
  catalog: {
    accessExternalCatalog: ['all'],
  },
};

export interface ParseFunction {
  (stream: ReadableStream, stash: string): string
}

enum SAXParserState {
  DOCUMENT_JUNCTION_ENTRY,
  DOCUMENT_START,
  XMLDECL_START,
  XMLDECL_PREVERSION_NAME_WHITESPACE,
  XMLDECL_VERSION_NAME,
  XMLDECL_PREVERSION_EQ_WHITESPACE,
  XMLDECL_VERSION_EQ,
  XMLDECL_PREVERSION_VALUE_WHITESPACE,
  XMLDECL_VERSION_VALUE_OPEN,
  XMLDECL_VERSION_VALUE,
  XMLDECL_VERSION_VALUE_CLOSE,
  XMLDECL_POSTVERSION_VALUE_WHITESPACE,
  XMLDECL_POSTVERSION_VALUE_JUNCTION_ENTRY,
  XMLDECL_POSTVERSION_VALUE_JUNCTION, // Junction function to figure out where to go after non-whitespace.
//  XMLDECL_PREENCODING_NAME_WHITESPACE,
  XMLDECL_ENCODING_NAME,
  XMLDECL_PREENCODING_EQ_WHITESPACE,
  XMLDECL_ENCODING_EQ,
  XMLDECL_PREENCODING_VALUE_WHITESPACE,
  XMLDECL_ENCODING_VALUE_OPEN,
  XMLDECL_ENCODING_VALUE,
  XMLDECL_ENCODING_VALUE_CLOSE,
  XMLDECL_POSTENCODING_VALUE_WHITESPACE,
  XMLDECL_POSTENCODING_VALUE_TRAMPOLINE,
  XMLDECL_STANDALONE_NAME,
  XMLDECL_PRESTANDALONE_EQ_WHITESPACE,
  XMLDECL_STANDALONE_EQ,
  XMLDECL_PRESTANDALONE_VALUE_WHITESPACE,
  XMLDECL_STANDALONE_VALUE_OPEN,
  XMLDECL_STANDALONE_VALUE,
  XMLDECL_STANDALONE_VALUE_CLOSE,
  XMLDECL_POSTSTANDALONE_VALUE_WHITESPACE,
  XMLDECL_POSTSTANDALONE_VALUE_TRAMPOLINE,
  XMLDECL_END,
  PROLOG_WHITESPACE,
  DTD_START,
  PI_TARGET,
  PI_PREDATA_WHITESPACE,
  PI_DATA,
  XML_TAG_OPEN_START,
  STARTTAG_NAME,
  STARTTAG_WHITESPACE,
  STARTTAG_ATTR_NAME,
  STARTTAG_PREATTR_EQ,
  STARTTAG_ATTR_EQ,
  STARTTAG_POSTATTR_EQ,
  STARTTAG_ATTR_VALUE,
  XML_COMMENT_START,
  ENDTAG_NAME,
}

export enum SAXParserFeatures {
  NAMESPACES = 'http://xml.org/sax/features/namespaces',
  NAMESPACE_PREFIXES = 'http://xml.org/sax/features/namespace-prefixes',
  EXTERNAL_GENERAL_ENTITIES = 'http://xml.org/sax/features/external-general-entities',
  EXTERNAL_PARAMETER_ENTITES = 'http://xml.org/sax/features/external-parameter-entities',
}

export interface PrefixMapping {
  parent?: PrefixMapping,
  prefixes: Omit<{[prefix: string]: string}, 'xml'>,
}

export interface PICallbackPayload {
  target: string,
  data?: string,
}

export interface XMLDeclarationCallbackPayload extends PICallbackPayload {
  xmlVersion: string,
  encoding?: string,
  standalone?: string,
}

export interface ValidatingErrorCallback {
  (err: SAXDocumentValidityError): void
}

export class SAXParserError extends Error {}
export class ConfigError extends SAXParserError {}

export interface ParseErrorOptions {
  char: number,
  line: number,
  buffer: string,
  keyword: string,
}

export class SAXParseError extends SAXParserError {
  char?: number;
  line?: number;
  buffer?: string;
  keyword?: string;
  constructor(message: string | undefined = undefined, options?: ParseErrorOptions) {
    super(message);

    if (options)
      ({
        buffer: this.buffer,
        line: this.line,
        char: this.char,
        keyword: this.keyword,
      } = options);
  }
}
export class UnsupportedStreamTypeError extends SAXParseError {}
export class DocumentWellFormednessError extends SAXParseError {}
export class SAXDocumentValidityError extends SAXParseError {}
export class MissingXMLDeclError extends SAXDocumentValidityError {
  constructor(message = 'Valid XML documents MUST begin with "<?xml"', options?: ParseErrorOptions) {
    super(message);
  }
}
export class MissingVersionInfoError extends SAXParserError {
  constructor(message = 'XML declaration MUST have "version" as its first attribute') {
    super(message);
  }
}

export class SAXParser extends EventEmitter<{
  warning: [SAXParseError],
  error: [SAXDocumentValidityError],
  fatalError: [SAXParseError],
  startDocument: [],
  xmlDeclaration: [XMLDeclarationCallbackPayload],
  comment: [chars: string],
  processingInstruction: [target: string, data: string],
  startDTD:
    | [{name: string, publicId?: string}]
    | [{name: string, systemId?: string}],
  internalEntityDecl: [name: string, value: string],
  externalEntityDecl: 
    | [{name: string, publicId?: string}]
    | [{name: string, systemId?: string}],
  notationDecl:
    | [{name: string, publicId?: string}]
    | [{name: string, systemId?: string}],
  unparseEntityDecl:
    | [{name: string, publicId?: string, notationName: string}]
    | [{name: string, systemId?: string, notationName: string}],
  startEntity: [name: string],
  endEntity: [name: string],
  endDTD: [],
  ignorableWhitespace: [char: string],
  startPrefixMapping: [prefix: string, uri: string],
  startElement:
    // Namespace: true; Namespace Prefix: true
    | [{uri: string, localName: string, qName: string, attributes: {uri: string, localName: string, qName: string, value: string}[]}]
    // Namespace: false; Namespace Prefix: true
    | [{qName: string, attributes: {qName: string, value: string}[]}]
    // Namespace: true; Namespace Prefix: false 
    | [{uri: string, localName: string, attributes: {uri: string, localName: string, value: string}[]}]
  endElement: [uri: string, localName: string, qName: string],
  skippedEntity: [name: string],
  endPrefixMapping: [prefix: string],
  endDocument: [],
}> {
  protected __prevState = SAXParserState.DOCUMENT_JUNCTION_ENTRY;
  protected __state = SAXParserState.DOCUMENT_JUNCTION_ENTRY;
  protected __cursor = {
    char: 0,
    line: 0,
    column: 0,
  }
  
  protected __bufferCursor = 0;
  protected __streamCursor = 0;

  protected static __codePointToString(codePoint: (string|string[])[]): string[]  {
    return codePoint.reduce<string[]>((pV, cV) => {
        if (typeof cV === 'string')
          cV = [cV];
        
        pV.push(
          String.fromCodePoint(...cV.map<number>(x => parseInt(x, 16))));
        return pV;
      }, []);
  }

  private static readonly KEYWORDS = {
    XML_WHITESPACE_CHARS: new Set(['20', '9', '9'].map(x => String.fromCodePoint(parseInt(x, 16)))), // Excludes newline chars
    XML_WHITESPACE_NORMALIZED_SEQ: String.fromCodePoint(parseInt('20', 16)),
    XML_NEWLINE_SEQ: this.__codePointToString([['D', 'A'], 'D']),
    XML_NEWLINE_SEQ_MAX_CHARS: 2,
    XML_NEWLINE_NORMALIZED_SEQ: String.fromCodePoint(parseInt('10', 16)),
    XML11_NEWLINE_SEQ: this.__codePointToString([
      ['D', 'A'],
      ['D', '85'],
      ['85'],
      ['2028'],
      ['D'],
    ]),
    XML11_NEWLINE_SEQ_MAX_CHARS: 2,
    XML_DECL_START: '<?',
    XML_DECL_TARGET: 'xml',
    XML_DECL_END: '?>',
    XML_DECL_VERSION_NAME: 'version',
    XML_DECL_VERSION_VALUE_MIN_CHARS: 3,
//    XML_DECL_VERSION_VALUE_CHARS: new Set('0123456789.'),
    XML_DECL_VERSION_VALUE_REGEXP: /^1.[0-9]/,
    XML_DECL_ENCODING_NAME: 'encoding',
    XML_DECL_ENCODING_VALUE_MIN_CHARS: 1,
    XML_DECL_ENCODING_VALUE_REGEXP: /^[A-Za-z][A-Za-z0-9._-]*/,
//    XML_DECL_ENCODING_VALUE_CHAR_RANGES: [
//      ['48', '57'], // 0-9
//      ['65', '90'], // A-Z
//      ['97', '122'], // a-z
//      '45', // -
//      '46', // '.'
//      '95', // _
//    ],
    XML_DECL_STANDALONE_NAME: 'standalone',
    XML_DECL_STANDALONE_VALUE_VALUES: {
      YES: 'yes',
      NO: 'no',
    },
    XML_PI_START: '<?',
    XML_PI_END: '?>',
    XML_TAG_OPEN_START: '<',
    XML_TAG_CLOSE_START: '</',
    XML_TAG_CLOSE_END: '>',
    XML_ELEM_SELFCLOSE_END: '/>',
    XML_ATTR_VALUE_BOUNDARY_CHARS: new Set(['"', '\'']),
    XML_EQ: '=',
    XML_COMMENT_START: '<!--',
    XML_COMMENT_END: '-->',
    XML_ENTITY_REF_START: '&',
    XML_ENTITY_REF_END: ';',
    XML_PE_REF_START: '%',
    XML_PE_REF_END: ';',
    DTD_DECL_START: '<!',
    DTD_DECL_END: '>',
    DTD_DECL_EXTERNALID_VALUES: {
      PUBLIC: 'PUBLIC',
      SYSTEM: 'SYSTEM',
    },
    DTD_DECL_TARGET_VALUES: {
      DOCTYPE: 'DOCTYPE',
      ENTITY: 'ENTITY',
      ELEMENT: 'ELEMENT',
      ATTRLIST: 'ATTRLIST',
    },
    DTD_DECL_GROUP_START: '(',
    DTD_DECL_GROUP_END: ')',
    DTD_DOCTYPE_INTERNALSUBSET_START: '[',
    DTD_DOCTYPE_INTERNALSUBSET_END: ']',
    DTD_PE_DECL_TARGET_SUFFIX: '%', // Example: '<!ENTITY %'
    DTD_ENTITY_DECL_CONTENT_VALUES: {
      ANY: 'ANY',
      EMPTY: 'EMPTY',
    },
    DTD_ENTITY_DECL_NDATA_SUFFIX: 'NDATA', // Example: '<!ENTITY ... NDATA>'
    DTD_ENTITY_DECL_MIXED_PCDATA_CONTENT: '#PCDATA',
    DTD_ENTITY_DECL_CONTENT_DELIM_VALUES: {
      CHOICE: ',',
      SEQ: '|',
    },
    DTD_ENTITY_DECL_CONTENT_SUFFIX_VALUES: {
      ZERO_OR_ONE: '+',
      ZERO_OR_MORE: '*',
      ONE_OR_MORE: '?',
    },
    DTD_ATTRLIST_DEFAULT_DECL_PREFIX_VALUES: {
      REQUIRED: '#REQUIRED',
      IMPLIED: '#IMPLIED',
      FIXED: '#FIXED',
    },
    XMLNS_PREFIX: 'xmlns',
    XMLNS_DELIM: ':',
  };

  private static readonly RESERVED_XMLNS_PREFIXES = new Map(Object.entries({
    xml: 'http://www.w3.org/XML/1998/namespace',
    xmlns: 'http://www.w3.org/2000/xmlns/',
  }));

  private static readonly PREDEFINED_GENERAL_ENTITIES = new Map(Object.entries({
    lt: '&#38;#60;',
    gt: '&#62;',
    amp: '&#38;#38;',
    apos: '&#39;',
    quot: '&#34;',
  }));

  /**
   * @throws {@link ConfigError}
   */
  constructor(public readonly config: SAXParserConfig = DEFAULT_SAX_PARSER_CONFIG) {
    super();
    
    let selfConstructor = this.constructor as any;
    if (!selfConstructor)
      throw new ConfigError('Unable to access Parser class static members. Missing `constructor` member.');

    const requiredStaticMembers = ['KEYWORDS','RESERVED_XMLNS_PREFIXES','PREDEFINED_GENERAL_ENTITIES'];
    for (const keyword of requiredStaticMembers) {
      if (!(selfConstructor[keyword] instanceof Object))
      throw new ConfigError('Parser class is missing or contains invalid ' + keyword + ' static member.');
    }

    if (this.config.doc.validating) 
      this._validationError = function(err) { throw err };
    else
      this._validationError = function(err) { this.emit('error', err) };
  }

  private _validationError: ValidatingErrorCallback;
  private _wellFormednessError(err: DocumentWellFormednessError) {
    err.char = this.__streamCursor + this.__bufferCursor;
    err.line = this.__cursor.line;
    throw err;
  }
  
  /**
   * @emits `startDocument`
   * @emits `endDocument`
   * @emits `xmlDeclaration`
   * @emits `error`
   */
  async parse(stream: ReadableStream) {
    return this._parseReadableStream(stream)
  }

  /**
   * @emits `startDocument`
   * @emits `endDocument`
   * @emits `xmlDeclaration`
   * @emits `error`
   */
  private async _parseReadableStream(stream: ReadableStream) {
    let selfConstructor = this.constructor as typeof SAXParser;
    const reader = stream.getReader();
    var {done, value} = await reader.read();
    var buffer = value;
    var streamCursorAhead = buffer.length;
    const keywords = selfConstructor.KEYWORDS;
    let keyword: string = '';
    let keywordRegExp: RegExp;
    let keywordArr: string[];
    let keywordSet: Set<string>;
    var keywordMinChars = 0;
    var keywordMaxChars = 0;
    let keywordJunctionList: string[] = [];
    let keywordObj: Record<string,string> | undefined = undefined;
    let keywordJunctionListShortest = 0;
    let attributeURI = '';
    let attributePrefix = '';
    let attributeLocalName = '';
    let attributeValue = '';
    
    this.emit('startDocument');
    while (buffer !== '') {
      switch(this.__state) {
        case SAXParserState.DOCUMENT_JUNCTION_ENTRY:
          keywordJunctionList.push(
            keywords.XML_DECL_START + keywords.XML_DECL_TARGET,
            keywords.DTD_DECL_START + keywords.DTD_DECL_TARGET_VALUES.DOCTYPE,
            keywords.XML_TAG_OPEN_START,
            keywords.XML_COMMENT_START,
          );
          keywordJunctionListShortest = keywordJunctionList.reduce<number>((pV, cV) => pV = cV.length < pV ? cV.length : pV, Number.MAX_VALUE);

        case SAXParserState.DOCUMENT_START:
          if (buffer.length < keywordJunctionListShortest)
            break;

          for (let i=0; i<keywordJunctionList.length; i++) {
            if (buffer.startsWith(keywordJunctionList[i])) {
              keyword = keywordJunctionList[i];
              break;
            }
          }

          switch (keyword) {
            case keywords.XML_DECL_START + keywords.XML_DECL_TARGET:
            case keywords.DTD_DECL_START + keywords.DTD_DECL_TARGET_VALUES.DOCTYPE:
            case keywords.XML_TAG_OPEN_START:
              while (keywordJunctionList.shift() !== keyword) {}
            case keywords.XML_COMMENT_START:
              switch (keyword) {
                case keywords.XML_DECL_START + keywords.XML_DECL_TARGET:
                  this.__state = SAXParserState.XMLDECL_START;
                  break;
                case keywords.DTD_DECL_START + keywords.DTD_DECL_TARGET_VALUES.DOCTYPE:
                  this.__state = SAXParserState.DTD_START;
                  break;
                case keywords.XML_TAG_OPEN_START:
                  this.__state = SAXParserState.XML_TAG_OPEN_START;
                  break;
                case keywords.XML_COMMENT_START:
                  this.__state = SAXParserState.XML_COMMENT_START;
                  break;
              }
              break;

            default:
              this._wellFormednessError(new DocumentWellFormednessError());
          }
          
          break;
        case SAXParserState.XMLDECL_START:
          if (buffer.length < keyword.length)
            continue;
          if (!buffer.startsWith(keyword)) {
            this._validationError(new MissingXMLDeclError());
            this.__state++;
            break;
          }
          buffer = buffer.slice(keyword.length);
          var xmlDeclCallbackPayload: Partial<XMLDeclarationCallbackPayload> = {
            target: keywords.XML_DECL_TARGET,
            data: '',
          }
          this.__state++;
          break;

        case SAXParserState.XMLDECL_PREVERSION_NAME_WHITESPACE:
        case SAXParserState.XMLDECL_PREVERSION_EQ_WHITESPACE:
        case SAXParserState.XMLDECL_PREVERSION_VALUE_WHITESPACE:
        case SAXParserState.XMLDECL_POSTVERSION_VALUE_WHITESPACE:
          
        case SAXParserState.XMLDECL_PREENCODING_EQ_WHITESPACE:
        case SAXParserState.XMLDECL_PREENCODING_VALUE_WHITESPACE:
        case SAXParserState.XMLDECL_POSTENCODING_VALUE_WHITESPACE:
          
        case SAXParserState.XMLDECL_PRESTANDALONE_EQ_WHITESPACE:
        case SAXParserState.XMLDECL_PRESTANDALONE_VALUE_WHITESPACE:
        case SAXParserState.XMLDECL_POSTSTANDALONE_VALUE_WHITESPACE:
          keywordArr = keywords.XML_NEWLINE_SEQ;
          keywordSet = keywords.XML_WHITESPACE_CHARS;
          outerLoop:
          for (; this.__bufferCursor<buffer.length; this.__bufferCursor++) {
            if (!keywordSet.has(buffer[this.__bufferCursor])) {
              for (let i=0; i<keywordArr.length; i++)
                if (buffer.slice(this.__bufferCursor).startsWith(keywordArr[i])) {
                  this.__cursor.line++;
                  continue outerLoop;
                }
              xmlDeclCallbackPayload!.data += buffer.slice(0, this.__bufferCursor);
              buffer = buffer.slice(this.__bufferCursor);
              this.__bufferCursor = 0;
              this.__state++;
              break;
            }
          }
          break;
          
        case SAXParserState.XMLDECL_VERSION_NAME:
          keyword = keywords.XML_DECL_VERSION_NAME;
          if (buffer.length<keyword.length)
            break;
          if (!buffer.startsWith(keyword))
            throw new MissingVersionInfoError();
          xmlDeclCallbackPayload!.data += attributeLocalName = keyword;
          buffer = buffer.slice(keyword.length);
          this.__state++;
          break;

        case SAXParserState.XMLDECL_VERSION_EQ:
        case SAXParserState.XMLDECL_ENCODING_EQ:
        case SAXParserState.XMLDECL_STANDALONE_EQ:
            keyword = keywords.XML_EQ;
          if (buffer.length < keyword.length)
            break;
          if (!buffer.startsWith(keyword))
            throw new SAXParserError();
          xmlDeclCallbackPayload!.data += keyword;
          buffer = buffer.slice(keyword.length);
          this.__state++;
          break;
          
        case SAXParserState.XMLDECL_VERSION_VALUE_OPEN:
        case SAXParserState.XMLDECL_VERSION_VALUE_CLOSE:
        case SAXParserState.XMLDECL_ENCODING_VALUE_OPEN:
        case SAXParserState.XMLDECL_ENCODING_VALUE_CLOSE:
        case SAXParserState.XMLDECL_STANDALONE_VALUE_OPEN:
        case SAXParserState.XMLDECL_STANDALONE_VALUE_CLOSE:
          keywordSet = keywords.XML_ATTR_VALUE_BOUNDARY_CHARS;
          if (!keywordSet.has(buffer[0]))
            throw new SAXDocumentValidityError();
          xmlDeclCallbackPayload!.data += buffer[0];
          buffer = buffer.slice(1);
          this.__state++;
          break;
          
        case SAXParserState.XMLDECL_VERSION_VALUE:
          keywordMinChars = keywords.XML_DECL_VERSION_VALUE_MIN_CHARS
          if (buffer.length < keywordMinChars)
            break;
          keywordRegExp = keywords.XML_DECL_VERSION_VALUE_REGEXP;
          keyword = keywordRegExp.exec(buffer)?.[0] || '';
          if (keyword === '')
            throw new SAXParserError();
          if (keyword.length >= buffer.length)
            break;
          xmlDeclCallbackPayload!.data += xmlDeclCallbackPayload!.xmlVersion = keyword;
          buffer = buffer.slice(keyword.length);
          this.__state++;
          break;

        case SAXParserState.XMLDECL_POSTVERSION_VALUE_JUNCTION_ENTRY:
          keywordJunctionList.push(
              keywords.XML_DECL_ENCODING_NAME,
              keywords.XML_DECL_STANDALONE_NAME,
              keywords.XML_DECL_END,
          );
          keywordJunctionListShortest = keywordJunctionList.reduce<number>((pV, cV) => {
            return cV.length < pV ? cV.length : pV;
          }, Number.MAX_VALUE);
          
        case SAXParserState.XMLDECL_POSTVERSION_VALUE_JUNCTION:
          if (buffer.length < keywordJunctionListShortest)
            break;
          for (let i=0; i<keywordJunctionList!.length; i++) {
            if (buffer.startsWith(keywordJunctionList![i])) {
              keyword = keywordJunctionList![i];
              break;
            }
          }

          switch (keyword) {
            case keywords.XML_DECL_END:
            case keywords.XML_DECL_ENCODING_NAME:
            case keywords.XML_DECL_STANDALONE_NAME:
              while (keywordJunctionList!.shift() !== keyword) {}
           
              switch (keyword) {
                case keywords.XML_DECL_END:
                  this.__state = SAXParserState.XMLDECL_END;
                  break;
                case keywords.XML_DECL_ENCODING_NAME:
                  this.__state = SAXParserState.XMLDECL_ENCODING_NAME;
                  break;
                case keywords.XML_DECL_STANDALONE_NAME:
                  this.__state = SAXParserState.XMLDECL_STANDALONE_NAME;
                  break;
              }
              break;

            default:
              throw new SAXParserError();
          }
          break;

        // PARENT STATE: SAXParserState.XMLDECL_POSTVERSION_VALUE_JUNCTION
        case SAXParserState.XMLDECL_END:
          xmlDeclCallbackPayload!.data = xmlDeclCallbackPayload!.data!.trimStart();
          this.emit('xmlDeclaration', xmlDeclCallbackPayload! as XMLDeclarationCallbackPayload);
          buffer = buffer.slice(keyword.length);
          this.__state = SAXParserState.DOCUMENT_START;
          break;
        
        // PARENT STATE: SAXParserState.XMLDECL_POSTVERSION_VALUE_JUNCTION
        case SAXParserState.XMLDECL_ENCODING_NAME:
        case SAXParserState.XMLDECL_STANDALONE_NAME: 
          xmlDeclCallbackPayload!.data += keyword;
          attributeLocalName = keyword;
          buffer = buffer.slice(keyword.length);
          this.__state++
          break;

        case SAXParserState.XMLDECL_ENCODING_VALUE:
          keywordMinChars = keywords.XML_DECL_ENCODING_VALUE_MIN_CHARS;
          if (buffer.length < keywordMinChars)
            break;
          keywordRegExp = keywords.XML_DECL_ENCODING_VALUE_REGEXP;
          keyword = keywordRegExp.exec(buffer)?.[0] || '';
          if (keyword === '')
            throw new SAXParserError();
          if (keyword.length >= buffer.length)
            break;
          xmlDeclCallbackPayload!.data += xmlDeclCallbackPayload!.encoding = keyword;
          buffer = buffer.slice(keyword.length);
          this.__state++;
          break;
          
        case SAXParserState.XMLDECL_STANDALONE_VALUE:
          keywordObj = keywords.XML_DECL_STANDALONE_VALUE_VALUES;
          var {keywordMinChars, keywordMaxChars} =
            Object
                .values<string>(keywordObj)
                .reduce<{keywordMinChars: number, keywordMaxChars: number}>(
                  (pV, cV) => {
                    let cLen = cV.length;
                    if (cLen < pV.keywordMinChars)
                      pV.keywordMinChars = cLen;
                    if (cLen > pV.keywordMaxChars)
                      pV.keywordMaxChars = cLen;
                    return pV;
                  }, {
                    keywordMinChars: Number.MAX_VALUE,
                    keywordMaxChars: 0
                  });
          if (buffer.length < keywordMinChars)
            break;
          
          for (const key in keywordObj)
            if (buffer.startsWith(keywordObj[key])) {
              keyword = keywordObj[key];
              xmlDeclCallbackPayload!.data += xmlDeclCallbackPayload!.standalone = keyword;
              buffer = buffer.slice(keyword.length); 
              this.__state++;
            }
          
          if (buffer.length > keywordMaxChars)
            throw new SAXParserError();
          break;

        case SAXParserState.XMLDECL_POSTENCODING_VALUE_TRAMPOLINE:
        case SAXParserState.XMLDECL_POSTSTANDALONE_VALUE_TRAMPOLINE:
          this.__state = SAXParserState.XMLDECL_POSTVERSION_VALUE_JUNCTION;
          break;

        case SAXParserState.DTD_START:
          if (buffer.length < keyword.length)
            continue;
          if (!buffer.startsWith(keyword))
            this._validationError(new SAXDocumentValidityError());
          this.__state++;
          break;
      }

      if (!done) {
        var {done, value} = await reader.read();
        if (typeof value === 'string') {
          buffer += value;
          this.__streamCursor = streamCursorAhead;
          streamCursorAhead += value.length;
        }
      }
    }
    this.emit('endDocument');
  }
}
