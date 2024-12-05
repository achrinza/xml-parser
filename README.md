# XML SAX Parser for Node.js / JavaScript (Work in Progress)

This is an experiment to attempt implementation of a validating XML SAX parser in pure-JavaScript.

> [!WARNING]
> This library cannot parse XML documents in any meaningful way at this moment.


## What can it do now?

It can only read an XML declaration (e.g. `<?xml version="1.0" charset="UTF-8" standalone="yes"?>`).

To test this out:

```sh
$ git clone https://github.com/achrinza/xml-parser
$ cd xml-paresr
$ npm ci
$ npm run build
$ npm start
```

## Overview

## Goals

- **Flexible**
- Pure-JavaScript
- Browser and Node.js-compatible with no bundling
- SAX-compatible streaming API
- Validating
- XML 1.0 and XML 1.1 spec-compliant
- Markup declaration-aware (aka. reosolve entity references against DTD subset)
- Similar security boundaries as [JAXP](https://docs.oracle.com/javase/8/docs/technotes/guides/security/jaxp/jaxp.html#streaming-api-for-xml-and-jaxp-properties).
- Namespace-aware
- xInclude-aware

Currently out of scope (for now) but in the back of the mind:

- DOM parser
  Focus on the SAX parser first;
  The plan is to build a DOM parser on top of the SAX parser.
- XML Schema-aware (why does this spec have 5 parts?)
- RELAX-NG
- XML Catalog-aware
- XSLT 3.0 streamable transformations
- XML Fast InfoSet
- XML XOP (Need an MIME parser)


## Flexibility

The `SAXParser` class has static members which can be altered to change its behaviour.

| Static member                           | Description                                                            |
|-----------------------------------------|------------------------------------------------------------------------|
| `SAXParser.KEYWORDS`                    | Tokens used to identify fundamental XML elements                       |
| `SAXParser.RESERVED_XMLNS_PREFIXES`     | XML namespace prefixes that cannot be overriden by the parsed document |
| `SAXParser.PREDEFINED_GENERAL_ENTITIES` | XML general entities that are predefined for substitution              |
| `SAXParserConfig`                       | Configuration options; Most options have no effect at the moment       |

For `SAXParser.KEYWORDS`, strings and O(1)-like data types are used where possible (e.g. for tokens with only one value or tokens with multiple tokens of equal, known length). Otherwise, arrays of strings are used.

## Principles

- Parser works with strings. Hence, constants should be "precompilied" as strings before parse.
- Reduce the need for object property traversal. Leverage existing local variables where possible, but do not reinstantiate complex variables.
- Reduce the number of hot functions. Exceptions to this are functions that should be rarely triggered (e.g. raising validation/well-formedness errors) and event emitters.
- Use POJOs when all the keys are `number`s.
- Use `Set`s for constants with multiple valid values where possible
- Fallback to arrays for multi-value constants with variable length

- Logic for each state must be self-contained. States must not be aware of the next state's expected values. The exceptio to this are junction states
- Use junction states where there are multiple valid next states
- Use entry states with fallthrough (i.e. no `break`) during explicit state change to reduce redundant state reinitialization, such as to assign `keyword*` variables.

## License

The source code is dual-licensed. Hence, you may modify an re-release under either, or both licenses.

[EPL-2.0](./LICENSES/EPL-2.0.txt) OR [GPL-2.0-or-later](./LICENSES/GPL-2.0-or-only.txt)

Config files (e.g. `.gitignore`) are licensed under [FSFAP](./LICENSES/FSFAP.txt).

Check the individual files to verify the license.
