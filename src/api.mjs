import assign from './assign.mjs'
import defaultConverter from './converter.mjs'

function init(converter, defaultAttributes, cookiesProvider) {
  function set(name, value, attributes) {
    if (typeof document === 'undefined') {
      return
    }

    attributes = assign({}, defaultAttributes, attributes)

    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5)
    }
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString()
    }

    name = encodeURIComponent(name)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, escape)

    var stringifiedAttributes = ''
    for (var attributeName in attributes) {
      if (!attributes[attributeName]) {
        continue
      }

      stringifiedAttributes += '; ' + attributeName

      if (attributes[attributeName] === true) {
        continue
      }

      // Considers RFC 6265 section 5.2:
      // ...
      // 3.  If the remaining unparsed-attributes contains a %x3B (";")
      //     character:
      // Consume the characters of the unparsed-attributes up to,
      // not including, the first %x3B (";") character.
      // ...
      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0]
    }

    return cookiesProvider.set(
      name + '=' + converter.write(value, name) + stringifiedAttributes
    )
  }

  function get(name) {
    if (typeof document === 'undefined' || (arguments.length && !name)) {
      return
    }

    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all.
    var docCookie = cookiesProvider.get()
    var cookies = docCookie ? docCookie.split('; ') : []
    var jar = {}
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=')
      var value = parts.slice(1).join('=')

      try {
        var found = decodeURIComponent(parts[0])
        if (!(found in jar)) jar[found] = converter.read(value, found)
        if (name === found) {
          break
        }
      } catch (e) {
        // Do nothing...
      }
    }

    return name ? jar[name] : jar
  }

  return Object.create(
    {
      set,
      get,
      remove: function (name, attributes) {
        set(
          name,
          '',
          assign({}, attributes, {
            expires: -1
          })
        )
      },
      withAttributes: function (attributes) {
        return init(
          this.converter,
          assign({}, this.attributes, attributes),
          this.cookiesProvider
        )
      },
      withConverter: function (converter) {
        return init(
          assign({}, this.converter, converter),
          this.attributes,
          this.cookiesProvider
        )
      },
      withCookiesProvider: function (cookiesProvider) {
        return init(
          this.converter,
          this.attributes,
          assign({}, this.cookiesProvider, cookiesProvider)
        )
      }
    },
    {
      attributes: { value: Object.freeze(defaultAttributes) },
      converter: { value: Object.freeze(converter) },
      cookiesProvider: { value: Object.freeze(cookiesProvider) }
    }
  )
}

export default init(
  defaultConverter,
  { path: '/' },
  {
    get: () => document.cookie,
    set: (newVal) => {
      document.cookie = newVal
    }
  }
)
