import sanitizeHtml from "sanitize-html"

const allowedDescriptionTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "u",
  "ul",
]

export const sanitizeDescriptionHtml = (description: string): string =>
  sanitizeHtml(description, {
    allowedTags: allowedDescriptionTags,
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => {
        const href = attributes.href?.trim()
        const attribs: Record<string, string> = {}
        if (href == null || href === "") {
          return { tagName, attribs }
        }

        attribs.href = href
        attribs.target = "_blank"
        attribs.rel = "noreferrer"
        return { tagName, attribs }
      },
    },
  })
