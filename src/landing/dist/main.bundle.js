// src/signals/mod.ts
var SIGNAL_BRAND = Symbol.for("html-props:signal");
var context = [];
var pendingEffects = /* @__PURE__ */ new Set();
var isBatching = false;
var runEffects = /* @__PURE__ */ new Set();
var notifyDepth = 0;
function subscribe(running, subscriptions) {
  subscriptions.add(running.execute);
  running.dependencies.add(subscriptions);
}
function signal(initialValue) {
  let value = initialValue;
  const subscriptions = /* @__PURE__ */ new Set();
  const get = () => {
    const running = context[context.length - 1];
    if (running) subscribe(running, subscriptions);
    return value;
  };
  const notify = () => {
    notifyDepth++;
    try {
      for (const sub of [
        ...subscriptions
      ]) {
        if (!runEffects.has(sub)) {
          runEffects.add(sub);
          pendingEffects.add(sub);
        }
      }
      if (!isBatching) {
        while (pendingEffects.size > 0) {
          const toRun = Array.from(pendingEffects);
          pendingEffects.clear();
          toRun.forEach((fn2) => fn2());
        }
      }
    } finally {
      notifyDepth--;
      if (notifyDepth === 0) {
        runEffects.clear();
      }
    }
  };
  const set = (nextValue) => {
    value = nextValue;
    notify();
  };
  const update = (fn2) => {
    set(fn2(value));
  };
  const fn = get;
  fn.set = set;
  fn.get = get;
  fn.update = update;
  try {
    fn[SIGNAL_BRAND] = true;
  } catch {
  }
  return fn;
}
function cleanup(running) {
  for (const dep of running.dependencies) {
    dep.delete(running.execute);
  }
  running.dependencies.clear();
  if (typeof running.cleanup === "function") {
    try {
      running.cleanup();
    } catch (e) {
    }
    running.cleanup = void 0;
  }
}
function effect(fn, options) {
  let running;
  const execute = () => {
    if (running.disposed || running.executing) return;
    running.executing = true;
    cleanup(running);
    context.push(running);
    try {
      const result = fn();
      if (typeof result === "function") {
        running.cleanup = result;
      }
    } finally {
      context.pop();
      running.executing = false;
    }
  };
  running = {
    execute,
    dependencies: /* @__PURE__ */ new Set(),
    cleanup: void 0,
    disposed: false,
    executing: false
  };
  const dispose = () => {
    if (!running.disposed) {
      running.disposed = true;
      cleanup(running);
    }
  };
  if (options?.signal?.aborted) {
  } else {
    execute();
  }
  if (options?.signal) {
    options.signal.addEventListener("abort", dispose, {
      once: true
    });
  }
  try {
    dispose[Symbol.dispose] = dispose;
  } catch {
  }
  return dispose;
}

// src/core/mixin.ts
function HTMLPropsMixin(Base) {
  class HTMLPropsElement extends Base {
    // @ts-ignore: static props will be defined by subclass
    static props;
    static define(tagName, options) {
      customElements.define(tagName, this, options);
      return this;
    }
    // Store signals for props
    __signals = {};
    __cleanup = null;
    static get observedAttributes() {
      const props = this.props;
      if (!props) return [];
      return Object.entries(props).filter(([_, config]) => config.reflect || config.attr).map(([key, config]) => config.attr || key.toLowerCase());
    }
    constructor(...args) {
      super(...args);
      this.__initializeProps();
      const props = args[0];
      if (props && typeof props === "object" && !props.nodeType && !Array.isArray(props)) {
        this.__applyProps(props);
      }
    }
    __applyProps(props) {
      Object.entries(props).forEach(([key, value]) => {
        if (key === "style") {
          if (typeof value === "object") {
            Object.assign(this.style, value);
          } else {
            this.setAttribute("style", String(value));
          }
        } else if (key === "className" || key === "class") {
          this.setAttribute("class", value);
        } else if (key === "ref" && typeof value === "object" && "current" in value) {
          value.current = this;
        } else if (key.startsWith("on") && typeof value === "function") {
          const eventName = key.substring(2).toLowerCase();
          this.addEventListener(eventName, value);
        } else if (key === "content" || key === "children") {
          const nodes = Array.isArray(value) ? value : [
            value
          ];
          this.replaceChildren(...nodes);
        } else {
          if (key in this) {
            try {
              this[key] = value;
            } catch {
            }
          } else {
            if (value === true) {
              this.setAttribute(key, "");
            } else if (value != null && value !== false) {
              this.setAttribute(key, String(value));
            }
          }
        }
      });
    }
    __initializeProps() {
      const props = this.constructor.props;
      if (!props) return;
      Object.entries(props).forEach(([key, config]) => {
        const initialValue = config.default;
        const s = signal(initialValue);
        this.__signals[key] = s;
        Object.defineProperty(this, key, {
          get: () => s(),
          set: (v) => {
            const oldValue = s();
            if (oldValue !== v) {
              s.set(v);
              if (config.event) {
                this.dispatchEvent(new CustomEvent(config.event, {
                  detail: v
                }));
              }
            }
          },
          enumerable: true,
          configurable: true
        });
      });
    }
    connectedCallback() {
      if (super.connectedCallback) super.connectedCallback();
      if (this.onMount) this.onMount();
      this.__cleanup = effect(() => {
        if (this.render) {
          const content = this.render();
          this.replaceChildren(...(Array.isArray(content) ? content : [
            content
          ]).filter((n) => n));
        }
        const props = this.constructor.props;
        if (props) {
          Object.entries(props).forEach(([key, config]) => {
            if (config.reflect) {
              const val = this.__signals[key]();
              const attrName = config.attr || key.toLowerCase();
              if (config.type === Boolean) {
                if (val) {
                  if (!this.hasAttribute(attrName)) {
                    this.setAttribute(attrName, "");
                  }
                } else {
                  if (this.hasAttribute(attrName)) {
                    this.removeAttribute(attrName);
                  }
                }
              } else {
                if (val != null) {
                  const strVal = String(val);
                  if (this.getAttribute(attrName) !== strVal) {
                    this.setAttribute(attrName, strVal);
                  }
                } else {
                  this.removeAttribute(attrName);
                }
              }
            }
          });
        }
      });
    }
    disconnectedCallback() {
      if (super.disconnectedCallback) super.disconnectedCallback();
      if (this.onUnmount) this.onUnmount();
      if (this.__cleanup) {
        this.__cleanup();
        this.__cleanup = null;
      }
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (super.attributeChangedCallback) super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      const props = this.constructor.props;
      if (!props) return;
      const entry = Object.entries(props).find(([key, config]) => {
        const attr = config.attr || key.toLowerCase();
        return attr === name;
      });
      if (entry) {
        const [key, config] = entry;
        let val = newVal;
        if (config.type === Boolean) {
          val = newVal !== null;
        } else if (config.type === Number) {
          val = newVal === null ? null : Number(newVal);
        }
        this[key] = val;
      }
    }
  }
  return HTMLPropsElement;
}

// src/built-ins/mod.ts
var Div = HTMLPropsMixin(HTMLDivElement).define("html-div", {
  extends: "div"
});
var Span = HTMLPropsMixin(HTMLSpanElement).define("html-span", {
  extends: "span"
});
var Button = HTMLPropsMixin(HTMLButtonElement).define("html-button", {
  extends: "button"
});
var P = HTMLPropsMixin(HTMLParagraphElement).define("html-p", {
  extends: "p"
});
var A = HTMLPropsMixin(HTMLAnchorElement).define("html-a", {
  extends: "a"
});
var Img = HTMLPropsMixin(HTMLImageElement).define("html-img", {
  extends: "img"
});
var Input = HTMLPropsMixin(HTMLInputElement).define("html-input", {
  extends: "input"
});
var Label = HTMLPropsMixin(HTMLLabelElement).define("html-label", {
  extends: "label"
});
var H1 = HTMLPropsMixin(HTMLHeadingElement).define("html-h1", {
  extends: "h1"
});
var H2 = HTMLPropsMixin(HTMLHeadingElement).define("html-h2", {
  extends: "h2"
});
var H3 = HTMLPropsMixin(HTMLHeadingElement).define("html-h3", {
  extends: "h3"
});
var H4 = HTMLPropsMixin(HTMLHeadingElement).define("html-h4", {
  extends: "h4"
});
var H5 = HTMLPropsMixin(HTMLHeadingElement).define("html-h5", {
  extends: "h5"
});
var H6 = HTMLPropsMixin(HTMLHeadingElement).define("html-h6", {
  extends: "h6"
});
var Ul = HTMLPropsMixin(HTMLUListElement).define("html-ul", {
  extends: "ul"
});
var Ol = HTMLPropsMixin(HTMLOListElement).define("html-ol", {
  extends: "ol"
});
var Li = HTMLPropsMixin(HTMLLIElement).define("html-li", {
  extends: "li"
});
var Table = HTMLPropsMixin(HTMLTableElement).define("html-table", {
  extends: "table"
});
var Thead = HTMLPropsMixin(HTMLTableSectionElement).define("html-thead", {
  extends: "thead"
});
var Tbody = HTMLPropsMixin(HTMLTableSectionElement).define("html-tbody", {
  extends: "tbody"
});
var Tr = HTMLPropsMixin(HTMLTableRowElement).define("html-tr", {
  extends: "tr"
});
var Th = HTMLPropsMixin(HTMLTableCellElement).define("html-th", {
  extends: "th"
});
var Td = HTMLPropsMixin(HTMLTableCellElement).define("html-td", {
  extends: "td"
});
var Form = HTMLPropsMixin(HTMLFormElement).define("html-form", {
  extends: "form"
});
var Section = HTMLPropsMixin(HTMLElement).define("html-section", {
  extends: "section"
});
var Header = HTMLPropsMixin(HTMLElement).define("html-header", {
  extends: "header"
});
var Footer = HTMLPropsMixin(HTMLElement).define("html-footer", {
  extends: "footer"
});
var Nav = HTMLPropsMixin(HTMLElement).define("html-nav", {
  extends: "nav"
});
var Article = HTMLPropsMixin(HTMLElement).define("html-article", {
  extends: "article"
});
var Aside = HTMLPropsMixin(HTMLElement).define("html-aside", {
  extends: "aside"
});
var Main = HTMLPropsMixin(HTMLElement).define("html-main", {
  extends: "main"
});
var Pre = HTMLPropsMixin(HTMLPreElement).define("html-pre", {
  extends: "pre"
});
var Code = HTMLPropsMixin(HTMLElement).define("html-code", {
  extends: "code"
});

// src/landing/theme.ts
var theme = {
  colors: {
    bg: "#0f172a",
    text: "#e2e8f0",
    accent: "#38bdf8",
    accentHover: "#0ea5e9",
    secondaryBg: "#1e293b",
    border: "#334155",
    codeBg: "#020617",
    keyword: "#c678dd",
    className: "#e5c07b",
    function: "#61afef",
    string: "#98c379",
    number: "#d19a66",
    comment: "#5c6370",
    operator: "#56b6c2",
    property: "#e06c75"
  },
  fonts: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'Menlo', 'Monaco', 'Courier New', monospace"
  }
};

// src/landing/components/NavBar.ts
var NavBar = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    links: {
      type: Array,
      default: []
    }
  };
  render() {
    return new Header({
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.5rem 2rem",
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: "0",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: "100"
      },
      content: [
        new Div({
          style: {
            fontWeight: "700",
            fontSize: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          },
          content: [
            new Span({
              textContent: "</>",
              style: {
                color: theme.colors.accent
              }
            }),
            " HTML Props"
          ]
        }),
        new Nav({
          content: new Ul({
            style: {
              display: "flex",
              gap: "2rem",
              listStyle: "none",
              margin: "0",
              padding: "0"
            },
            content: this.links.map((link) => new Li({
              content: new A({
                href: link.href,
                textContent: link.label,
                style: {
                  color: theme.colors.text,
                  fontWeight: "500",
                  textDecoration: "none",
                  transition: "color 0.2s"
                },
                // Simple hover effect via mouse events since we can't use CSS :hover
                onMouseOver: (e) => e.target.style.color = theme.colors.accent,
                onMouseOut: (e) => e.target.style.color = theme.colors.text
              })
            }))
          })
        })
      ]
    });
  }
};
NavBar.define("app-navbar");

// src/landing/components/Hero.ts
var Hero = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    title: {
      type: String,
      default: ""
    },
    subtitle: {
      type: String,
      default: ""
    },
    primaryCta: {
      type: String,
      default: "Get Started"
    },
    secondaryCta: {
      type: String,
      default: "View on GitHub"
    },
    primaryCtaLink: {
      type: String,
      default: "#"
    },
    secondaryCtaLink: {
      type: String,
      default: "#"
    }
  };
  render() {
    const btnStyle = {
      display: "inline-block",
      padding: "0.75rem 1.5rem",
      borderRadius: "0.5rem",
      fontWeight: "600",
      transition: "all 0.2s",
      cursor: "pointer",
      border: "none",
      fontSize: "1rem",
      textDecoration: "none"
    };
    return new Section({
      style: {
        padding: "6rem 2rem",
        textAlign: "center",
        maxWidth: "1200px",
        margin: "0 auto"
      },
      content: [
        new H1({
          innerHTML: this.title,
          style: {
            fontSize: "3.5rem",
            lineHeight: "1.2",
            marginBottom: "1.5rem",
            background: "linear-gradient(to right, #fff, #94a3b8)",
            backgroundClip: "text",
            webkitBackgroundClip: "text",
            webkitTextFillColor: "transparent",
            color: "transparent"
          }
        }),
        new P({
          textContent: this.subtitle,
          style: {
            fontSize: "1.25rem",
            color: "#94a3b8",
            maxWidth: "600px",
            margin: "0 auto 2.5rem"
          }
        }),
        new Div({
          style: {
            display: "flex",
            gap: "1rem",
            justifyContent: "center"
          },
          content: [
            new A({
              href: this.primaryCtaLink,
              textContent: this.primaryCta,
              style: {
                ...btnStyle,
                backgroundColor: theme.colors.accent,
                color: theme.colors.bg
              },
              onMouseOver: (e) => {
                const el = e.target;
                el.style.backgroundColor = theme.colors.accentHover;
                el.style.transform = "translateY(-1px)";
              },
              onMouseOut: (e) => {
                const el = e.target;
                el.style.backgroundColor = theme.colors.accent;
                el.style.transform = "none";
              }
            }),
            new A({
              href: this.secondaryCtaLink,
              textContent: this.secondaryCta,
              style: {
                ...btnStyle,
                backgroundColor: theme.colors.secondaryBg,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`
              },
              onMouseOver: (e) => {
                const el = e.target;
                el.style.borderColor = theme.colors.accent;
                el.style.transform = "translateY(-1px)";
              },
              onMouseOut: (e) => {
                const el = e.target;
                el.style.borderColor = theme.colors.border;
                el.style.transform = "none";
              }
            })
          ]
        })
      ]
    });
  }
};
Hero.define("app-hero");

// src/landing/components/FeatureCard.ts
var FeatureCard = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    icon: {
      type: String,
      default: ""
    },
    title: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    }
  };
  render() {
    return new Div({
      style: {
        padding: "1.5rem",
        backgroundColor: theme.colors.bg,
        borderRadius: "0.75rem",
        border: `1px solid ${theme.colors.border}`,
        height: "100%"
      },
      content: [
        new Div({
          textContent: this.icon,
          style: {
            fontSize: "1.5rem",
            marginBottom: "1rem",
            display: "inline-block",
            padding: "0.5rem",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            borderRadius: "0.5rem",
            color: theme.colors.accent
          }
        }),
        new H3({
          textContent: this.title,
          style: {
            marginBottom: "0.5rem",
            fontSize: "1.1rem"
          }
        }),
        new P({
          textContent: this.description,
          style: {
            color: "#94a3b8",
            fontSize: "0.95rem"
          }
        })
      ]
    });
  }
};
FeatureCard.define("feature-card");

// src/landing/components/InstallBox.ts
var InstallBox = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    command: {
      type: String,
      default: ""
    }
  };
  render() {
    return new Div({
      style: {
        backgroundColor: theme.colors.codeBg,
        padding: "1rem 2rem",
        borderRadius: "0.5rem",
        fontFamily: theme.fonts.mono,
        display: "inline-flex",
        alignItems: "center",
        gap: "1rem",
        border: `1px solid ${theme.colors.border}`,
        marginTop: "2rem",
        color: "#a5b4fc"
      },
      content: [
        new Span({
          textContent: this.command
        }),
        new Button({
          title: "Copy to clipboard",
          textContent: "\u{1F4CB}",
          style: {
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            marginLeft: "1rem",
            transition: "color 0.2s"
          },
          onMouseOver: (e) => e.target.style.color = theme.colors.text,
          onMouseOut: (e) => e.target.style.color = "#64748b",
          onClick: () => {
            navigator.clipboard.writeText(this.command);
          }
        })
      ]
    });
  }
};
InstallBox.define("install-box");

// src/landing/components/LiveDemo.ts
var LiveDemo = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    code: {
      type: String,
      default: ""
    }
  };
  textarea;
  pre;
  previewContainer;
  errorContainer;
  highlight(code) {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const keywords = "import|from|class|extends|static|return|new|const|this|export|default|function|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|let|var|void|typeof|instanceof|in|of";
    const patterns = [
      // 1. Comment: // ...
      /(\/\/.*)/.source,
      // 2. String: '...' or `...`
      /('([^'\\\n]|\\.)*'|`([^`\\]|\\.)*`)/.source,
      // 3. Keyword
      `\\b(${keywords})\\b`,
      // 4. Function: name(
      /\b([a-zA-Z_]\w*)(?=\s*\()/.source,
      // 5. Property: name: or name=
      /([a-zA-Z_]\w*)(?=\s*[:=])/.source,
      // 6. Class: Capitalized
      /\b([A-Z][a-zA-Z0-9_]*)\b/.source,
      // 7. Number
      /\b(\d+)\b/.source,
      // 8. Member Access: .name
      /\.([a-zA-Z_]\w*)/.source,
      // 9. Operator / Punctuation
      /(&lt;|&gt;|&amp;|[=+\-*/|!%&^~<>?:.,;(){}[\]])/.source,
      // 10. Variable: name
      /\b([a-zA-Z_]\w*)\b/.source
    ];
    const regex = new RegExp(patterns.join("|"), "g");
    return escaped.replace(regex, (match, ...args) => {
      if (args[0]) return `<span style="color: ${theme.colors.comment}; font-style: italic;">${match}</span>`;
      if (args[1]) return `<span style="color: ${theme.colors.string}">${match}</span>`;
      if (args[4]) return `<span style="color: ${theme.colors.keyword}">${match}</span>`;
      if (args[5]) return `<span style="color: ${theme.colors.function}">${match}</span>`;
      if (args[6]) return `<span style="color: ${theme.colors.property}">${match}</span>`;
      if (args[7]) return `<span style="color: ${theme.colors.className}">${match}</span>`;
      if (args[8]) return `<span style="color: ${theme.colors.number}">${match}</span>`;
      if (args[9]) return `.<span style="color: ${theme.colors.property}">${args[9]}</span>`;
      if (args[10]) return `<span style="color: ${theme.colors.operator}">${match}</span>`;
      if (args[11]) return `<span style="color: #abb2bf">${match}</span>`;
      return match;
    });
  }
  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback();
    const style = document.createElement("style");
    style.textContent = `
      live-demo textarea::-webkit-scrollbar,
      live-demo pre::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      live-demo textarea::-webkit-scrollbar-track,
      live-demo pre::-webkit-scrollbar-track {
        background: ${theme.colors.codeBg};
      }
      live-demo textarea::-webkit-scrollbar-thumb,
      live-demo pre::-webkit-scrollbar-thumb {
        background: ${theme.colors.border};
        border-radius: 4px;
        border: 2px solid ${theme.colors.codeBg};
      }
      live-demo textarea::-webkit-scrollbar-thumb:hover,
      live-demo pre::-webkit-scrollbar-thumb:hover {
        background: ${theme.colors.comment};
      }
      live-demo textarea::-webkit-scrollbar-corner,
      live-demo pre::-webkit-scrollbar-corner {
        background: ${theme.colors.codeBg};
      }
    `;
    this.appendChild(style);
    this.style.display = "grid";
    this.style.gridTemplateColumns = "1fr 1fr";
    this.style.gap = "0";
    this.style.backgroundColor = theme.colors.secondaryBg;
    this.style.border = `1px solid ${theme.colors.border}`;
    this.style.borderRadius = "1rem";
    this.style.overflow = "hidden";
    this.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
    const editorCol = document.createElement("div");
    editorCol.style.display = "flex";
    editorCol.style.flexDirection = "column";
    editorCol.style.borderRight = `1px solid ${theme.colors.border}`;
    editorCol.style.minHeight = "835px";
    const editorWrapper = document.createElement("div");
    editorWrapper.style.position = "relative";
    editorWrapper.style.flex = "1";
    editorWrapper.style.backgroundColor = "#020617";
    editorWrapper.style.overflow = "hidden";
    const commonStyles = `
      margin: 0;
      padding: 1rem;
      font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      border: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      white-space: pre;
      overflow: auto;
    `;
    this.pre = document.createElement("pre");
    this.pre.style.cssText = commonStyles;
    this.pre.style.position = "absolute";
    this.pre.style.top = "0";
    this.pre.style.left = "0";
    this.pre.style.pointerEvents = "none";
    this.pre.style.color = "#e2e8f0";
    this.pre.style.zIndex = "0";
    this.textarea = document.createElement("textarea");
    this.textarea.value = this.code;
    this.textarea.style.cssText = commonStyles;
    this.textarea.style.position = "absolute";
    this.textarea.style.top = "0";
    this.textarea.style.left = "0";
    this.textarea.style.zIndex = "1";
    this.textarea.style.color = "transparent";
    this.textarea.style.background = "transparent";
    this.textarea.style.caretColor = "#e2e8f0";
    this.textarea.style.outline = "none";
    this.textarea.style.resize = "none";
    this.textarea.spellcheck = false;
    this.textarea.addEventListener("scroll", () => {
      this.pre.scrollTop = this.textarea.scrollTop;
      this.pre.scrollLeft = this.textarea.scrollLeft;
    });
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + "  " + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.updateHighlight();
        this.runCode();
      }
    });
    this.textarea.addEventListener("input", () => {
      this.updateHighlight();
      this.runCode();
    });
    editorWrapper.appendChild(this.pre);
    editorWrapper.appendChild(this.textarea);
    editorCol.appendChild(editorWrapper);
    this.errorContainer = document.createElement("div");
    this.errorContainer.style.padding = "0.5rem 1rem";
    this.errorContainer.style.backgroundColor = "rgba(220, 38, 38, 0.1)";
    this.errorContainer.style.color = "#f87171";
    this.errorContainer.style.fontSize = "0.8rem";
    this.errorContainer.style.borderTop = "1px solid rgba(220, 38, 38, 0.2)";
    this.errorContainer.style.display = "none";
    editorCol.appendChild(this.errorContainer);
    const previewCol = document.createElement("div");
    previewCol.style.display = "flex";
    previewCol.style.flexDirection = "column";
    previewCol.style.backgroundColor = "#1e293b";
    previewCol.style.backgroundImage = "radial-gradient(#334155 1px, transparent 1px)";
    previewCol.style.backgroundSize = "20px 20px";
    const previewContentWrapper = document.createElement("div");
    previewContentWrapper.style.flex = "1";
    previewContentWrapper.style.display = "flex";
    previewContentWrapper.style.alignItems = "center";
    previewContentWrapper.style.justifyContent = "center";
    previewContentWrapper.style.padding = "2rem";
    this.previewContainer = document.createElement("div");
    this.previewContainer.style.background = theme.colors.bg;
    this.previewContainer.style.padding = "2rem";
    this.previewContainer.style.borderRadius = "0.5rem";
    this.previewContainer.style.border = `1px solid ${theme.colors.border}`;
    this.previewContainer.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
    this.previewContainer.style.minWidth = "300px";
    previewContentWrapper.appendChild(this.previewContainer);
    previewCol.appendChild(previewContentWrapper);
    this.appendChild(editorCol);
    this.appendChild(previewCol);
    this.updateHighlight();
    this.runCode();
  }
  updateHighlight() {
    const code = this.textarea.value;
    this.pre.innerHTML = this.highlight(code) + "<br>";
  }
  runCode() {
    const code = this.textarea.value;
    this.errorContainer.style.display = "none";
    this.errorContainer.textContent = "";
    try {
      const cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, "");
      const classMatch = cleanCode.match(/class\s+(\w+)/);
      if (!classMatch) throw new Error("No class definition found");
      const className = classMatch[1];
      const uniqueTag = `live-${className.toLowerCase()}-${Math.random().toString(36).substring(7)}`;
      const codeWithUniqueTag = cleanCode.replace(/\.define\(['"](.*?)['"]\)/, `.define('${uniqueTag}')`);
      const func = new Function("HTMLPropsMixin", "HTMLElement", "Button", "Div", `return (function() { 
          ${codeWithUniqueTag};
          return ${className};
        })()`);
      const ComponentClass = func(HTMLPropsMixin, HTMLElement, Button, Div);
      if (ComponentClass) {
        const instance = new ComponentClass();
        this.previewContainer.replaceChildren(instance);
      }
    } catch (e) {
      this.errorContainer.style.display = "block";
      this.errorContainer.textContent = e.message;
    }
  }
};
LiveDemo.define("live-demo");

// src/landing/LandingPage.ts
var LandingPage = class extends HTMLPropsMixin(HTMLElement) {
  render() {
    return new Div({
      content: [
        new NavBar({
          links: [
            {
              label: "Documentation",
              href: "#/docs"
            },
            {
              label: "Examples",
              href: "#/examples"
            },
            {
              label: "GitHub",
              href: "https://github.com/html-props/core"
            }
          ]
        }),
        new Hero({
          title: "Reactive Custom Elements,<br>Simplified.",
          subtitle: "A lightweight mixin for building native Web Components with reactive props, signals, and zero dependencies. No build step required.",
          primaryCta: "Get Started",
          secondaryCta: "View on GitHub",
          primaryCtaLink: "#/docs",
          secondaryCtaLink: "https://github.com/html-props/core"
        }),
        new Section({
          style: {
            padding: "4rem 2rem",
            backgroundColor: theme.colors.secondaryBg,
            borderTop: `1px solid ${theme.colors.border}`,
            borderBottom: `1px solid ${theme.colors.border}`
          },
          content: new Div({
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "2rem",
              maxWidth: "1200px",
              margin: "0 auto"
            },
            content: [
              new FeatureCard({
                icon: "\u26A1",
                title: "Zero Dependencies",
                description: "Extremely lightweight. No framework lock-in. Just a simple mixin for your native HTMLElement classes."
              }),
              new FeatureCard({
                icon: "\u{1F504}",
                title: "Reactive Signals",
                description: "Built-in signal-based reactivity. Props automatically map to signals and trigger efficient updates."
              }),
              new FeatureCard({
                icon: "\u{1F4D8}",
                title: "TypeScript First",
                description: "Designed with strong type inference in mind. Define props via static config and get full type safety."
              }),
              new FeatureCard({
                icon: "\u{1F3A8}",
                title: "Native DOM",
                description: "Works seamlessly with standard DOM APIs. Use it with vanilla JS, or integrate into any framework."
              })
            ]
          })
        }),
        new Section({
          style: {
            padding: "6rem 2rem",
            maxWidth: "1200px",
            margin: "0 auto"
          },
          content: [
            new Div({
              style: {
                textAlign: "center",
                marginBottom: "3rem"
              },
              content: [
                new Div({
                  tagName: "h2",
                  textContent: "Write Less, Do More",
                  style: {
                    fontSize: "2.5rem",
                    marginBottom: "1rem",
                    fontWeight: "700"
                  }
                }),
                new P({
                  textContent: "Define props, handle events, and render content with a clean, declarative API.",
                  style: {
                    color: "#94a3b8"
                  }
                })
              ]
            }),
            new LiveDemo({
              code: `import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class CounterApp extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 }
  };

  render() {
    const { count } = this;
    
    return new Div({
      style: { padding: '1rem', textAlign: 'center' },
      content: [
        new Div({ 
            textContent: \`Count is: \${count}\`,
            style: { marginBottom: '1rem' }
        }),
        new Button({
          textContent: 'Increment',
          style: {
            backgroundColor: '#38bdf8',
            color: '#0f172a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontWeight: '600'
          },
          onclick: () => this.count++
        })
      ]
    });
  }
}

CounterApp.define('counter-app');`
            })
          ]
        }),
        new Section({
          style: {
            padding: "4rem 2rem",
            textAlign: "center",
            backgroundColor: theme.colors.secondaryBg,
            borderTop: `1px solid ${theme.colors.border}`
          },
          content: [
            new Div({
              tagName: "h2",
              textContent: "Ready to build?",
              style: {
                fontSize: "2.5rem",
                fontWeight: "700",
                marginBottom: "1rem"
              }
            }),
            new InstallBox({
              command: "deno add @html-props/core"
            })
          ]
        }),
        new Footer({
          style: {
            padding: "2rem",
            textAlign: "center",
            color: "#64748b",
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: "0.9rem"
          },
          content: new P({
            textContent: "\xA9 2025 HTML Props. MIT License."
          })
        })
      ]
    });
  }
};
LandingPage.define("landing-page");

// src/landing/components/Sidebar.ts
var Sidebar = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    items: {
      type: Array,
      default: []
    }
  };
  render() {
    console.log("Sidebar rendering items:", this.items);
    return new Aside({
      style: {
        width: "250px",
        borderRight: `1px solid ${theme.colors.border}`,
        height: "calc(100vh - 80px)",
        position: "sticky",
        top: "80px",
        overflowY: "auto",
        padding: "2rem 1rem",
        backgroundColor: theme.colors.bg
      },
      content: new Nav({
        content: new Ul({
          style: {
            listStyle: "none",
            padding: "0",
            margin: "0",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          },
          content: this.items.map((item) => new Li({
            content: new A({
              href: item.href,
              textContent: item.label,
              style: {
                display: "block",
                padding: "0.5rem 1rem",
                color: item.active ? theme.colors.accent : theme.colors.text,
                textDecoration: "none",
                backgroundColor: item.active ? "rgba(56, 189, 248, 0.1)" : "transparent",
                borderRadius: "0.25rem",
                fontWeight: item.active ? "600" : "400",
                transition: "all 0.2s ease"
              }
            })
          }))
        })
      })
    });
  }
};
Sidebar.define("docs-sidebar");

// src/landing/components/CodeBlock.ts
var CodeBlock = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    code: {
      type: String,
      default: ""
    }
  };
  highlight(code) {
    let result = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tokens = [];
    const save = (html) => {
      tokens.push(html);
      return `###TOKEN${tokens.length - 1}###`;
    };
    result = result.replace(/(\/\/.*)/g, (match) => save(`<span style="color: ${theme.colors.comment}; font-style: italic;">${match}</span>`));
    result = result.replace(/('.*?'|`.*?`)/g, (match) => save(`<span style="color: ${theme.colors.string}">${match}</span>`));
    result = result.replace(/\b(import|from|class|extends|static|return|new|const|this)\b/g, (match) => save(`<span style="color: ${theme.colors.keyword}">${match}</span>`));
    result = result.replace(/\b(HTMLPropsMixin|HTMLElement|Button|Div|CounterApp)\b/g, (match) => save(`<span style="color: ${theme.colors.className}">${match}</span>`));
    result = result.replace(/\b(render|define)\b/g, (match) => save(`<span style="color: ${theme.colors.function}">${match}</span>`));
    result = result.replace(/\b(\d+)\b/g, (match) => save(`<span style="color: ${theme.colors.number}">${match}</span>`));
    result = result.replace(/(\w+):/g, (match, name) => save(`<span style="color: ${theme.colors.property}">${name}</span>:`));
    tokens.forEach((token, index) => {
      result = result.replace(`###TOKEN${index}###`, () => token);
    });
    return result;
  }
  render() {
    return new Div({
      style: {
        backgroundColor: theme.colors.codeBg,
        padding: "1.5rem",
        fontFamily: theme.fonts.mono,
        fontSize: "0.9rem",
        overflowX: "auto",
        borderRight: `1px solid ${theme.colors.border}`
      },
      content: new Pre({
        content: new Code({
          innerHTML: this.highlight(this.code)
        })
      })
    });
  }
};
CodeBlock.define("code-block");

// src/landing/DocsPage.ts
var DocsPage = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    route: {
      type: String,
      default: "/docs"
    }
  };
  render() {
    const currentPath = this.route;
    console.log("DocsPage rendering with path:", currentPath);
    return new Div({
      style: {
        minHeight: "100vh",
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: theme.fonts.sans
      },
      content: [
        new NavBar({
          links: [
            {
              label: "Home",
              href: "#/"
            },
            {
              label: "Documentation",
              href: "#/docs"
            },
            {
              label: "GitHub",
              href: "https://github.com/html-props/core"
            }
          ]
        }),
        new Div({
          style: {
            display: "flex",
            maxWidth: "1400px",
            margin: "0 auto"
          },
          content: [
            new Sidebar({
              items: [
                {
                  label: "Introduction",
                  href: "#/docs",
                  active: currentPath === "/docs" || currentPath === "/docs/"
                },
                {
                  label: "Installation",
                  href: "#/docs/installation",
                  active: currentPath === "/docs/installation"
                },
                {
                  label: "CLI Tool",
                  href: "#/docs/cli",
                  active: currentPath === "/docs/cli"
                },
                {
                  label: "Builder",
                  href: "#/docs/builder",
                  active: currentPath === "/docs/builder"
                },
                {
                  label: "Basic Usage",
                  href: "#/docs/usage",
                  active: currentPath === "/docs/usage"
                },
                {
                  label: "Signals",
                  href: "#/docs/signals",
                  active: currentPath === "/docs/signals"
                },
                {
                  label: "Lifecycle Hooks",
                  href: "#/docs/lifecycle",
                  active: currentPath === "/docs/lifecycle"
                },
                {
                  label: "JSX Support",
                  href: "#/docs/jsx",
                  active: currentPath === "/docs/jsx"
                },
                {
                  label: "API Reference",
                  href: "#/docs/api",
                  active: currentPath === "/docs/api"
                }
              ]
            }),
            this.renderContent(currentPath)
          ]
        })
      ]
    });
  }
  renderContent(path) {
    if (path === "/docs/installation") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "Installation",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "You can install @html-props/core via JSR or import it directly from a CDN.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "Using Deno",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: "deno add @html-props/core"
          }),
          new H2({
            textContent: "Using npm",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: "npx jsr add @html-props/core"
          }),
          new H2({
            textContent: "CDN (ES Modules)",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: "import { HTMLPropsMixin } from 'https://esm.sh/@html-props/core';"
          })
        ]
      });
    }
    if (path === "/docs/cli") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "CLI Tool",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Scaffold new projects quickly with the html-props CLI.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "Creating a New Project",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: "deno run jsr:@html-props/create my-app"
          }),
          new P({
            textContent: 'This will create a new directory called "my-app" with a basic project structure.',
            style: {
              marginTop: "1rem",
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          })
        ]
      });
    }
    if (path === "/docs/usage") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "Basic Usage",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Create a new component by extending HTMLPropsMixin(HTMLElement).",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `import { HTMLPropsMixin } from '@html-props/core';
import { Div, Button } from '@html-props/built-ins';

class Counter extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 }
  };

  render() {
    return new Div({
      content: [
        new Div({ textContent: \`Count: \${this.count}\` }),
        new Button({
          textContent: 'Increment',
          onclick: () => this.count++
        })
      ]
    });
  }
}

Counter.define('my-counter');`
          })
        ]
      });
    }
    if (path === "/docs/signals") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "Signals",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Fine-grained reactivity for your components.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new P({
            textContent: "Signals are the backbone of reactivity in html-props. They allow you to create state that automatically updates your UI when changed.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `import { signal, effect } from '@html-props/signals';

const count = signal(0);

// Effects run whenever dependencies change
effect(() => {
  console.log(\`The count is \${count()}\`);
});

count(1); // Logs: "The count is 1"
count(2); // Logs: "The count is 2"`
          }),
          new H2({
            textContent: "Using Signals in Components",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Component props are internally backed by signals. You can also use standalone signals for local state.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `class Counter extends HTMLPropsMixin(HTMLElement) {
  // Local state
  count = signal(0);

  render() {
    return new Button({
      textContent: \`Count: \${this.count()}\`,
      onclick: () => this.count.update(n => n + 1)
    });
  }
}`
          }),
          new H2({
            textContent: "Computed Values",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Computed signals derive their value from other signals and update automatically.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `import { computed } from '@html-props/signals';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2
count(2);
console.log(double()); // 4`
          }),
          new H2({
            textContent: "Batch Updates",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Group multiple signal updates into a single effect run.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `import { batch } from '@html-props/signals';

batch(() => {
  count(10);
  count(20);
}); // Effects run only once`
          })
        ]
      });
    }
    if (path === "/docs/lifecycle") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "Lifecycle Hooks",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Hook into the lifecycle of your components.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "onMount()",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "onUnmount()",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `class Timer extends HTMLPropsMixin(HTMLElement) {
  count = signal(0);
  intervalId = null;

  onMount() {
    console.log('Timer mounted');
    this.intervalId = setInterval(() => {
      this.count.update(c => c + 1);
    }, 1000);
  }

  onUnmount() {
    console.log('Timer unmounted');
    clearInterval(this.intervalId);
  }

  render() {
    return new Div({ textContent: \`Seconds: \${this.count()}\` });
  }
}`
          })
        ]
      });
    }
    if (path === "/docs/jsx") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "JSX Support",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Use JSX syntax for templating in your components.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "Installation",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: "deno add jsr:@html-props/jsx"
          }),
          new H2({
            textContent: "Configuration",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Configure your compiler options in deno.json:",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@html-props/jsx"
  }
}`
          }),
          new H2({
            textContent: "Usage",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new CodeBlock({
            code: `import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  render() {
    return (
      <div class="container">
        <h1>Hello JSX</h1>
        <p>This is rendered using JSX!</p>
      </div>
    );
  }
}`
          })
        ]
      });
    }
    if (path === "/docs/api") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "API Reference",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new H2({
            textContent: "HTMLPropsMixin(Base)",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "The core mixin that adds reactivity to your Custom Elements.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new H2({
            textContent: "static props",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "Define reactive properties. Each key becomes a property on the instance and an observed attribute.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `static props = {
  myProp: { 
    type: String, // Number, Boolean, Array, Object
    default: 'value',
    reflect: true, // Reflect to attribute
    attr: 'my-prop' // Custom attribute name
  }
}`
          }),
          new H2({
            textContent: "Built-in Elements",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "A collection of type-safe wrappers for standard HTML elements. They accept all standard HTML attributes plus `style`, `class`, and `content`.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new CodeBlock({
            code: `import { Div, Button, Input } from '@html-props/built-ins';

// Usage
new Div({
  style: { padding: '1rem' },
  class: 'container',
  content: [
    new Button({ 
      textContent: 'Click me',
      onclick: () => console.log('Clicked')
    })
  ]
})`
          })
        ]
      });
    }
    if (path === "/docs/builder") {
      return new Article({
        style: {
          flex: "1",
          padding: "3rem 4rem",
          maxWidth: "800px"
        },
        content: [
          new H1({
            textContent: "Builder",
            style: {
              fontSize: "2.5rem",
              marginBottom: "1.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Visual HTML page building tool for VS Code.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          new Img({
            src: "builder_1.png",
            alt: "HTML Props Builder Interface",
            style: {
              width: "100%",
              borderRadius: "8px",
              marginBottom: "2rem",
              border: `1px solid ${theme.colors.border}`
            }
          }),
          new P({
            textContent: "The Builder allows you to construct web pages visually while maintaining full control over the underlying code. It bridges the gap between design and development by directly manipulating your source files.",
            style: {
              marginBottom: "1.5rem",
              color: "#94a3b8"
            }
          }),
          // Section 1: Getting Started
          new H2({
            textContent: "Getting Started",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "To open the visual editor:",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new Ul({
            style: {
              paddingLeft: "1.5rem",
              marginBottom: "2rem",
              color: "#94a3b8"
            },
            content: [
              new Li({
                textContent: "Right-click on any .html or .ts file in the explorer"
              }),
              new Li({
                textContent: 'Select "Open With..."'
              }),
              new Li({
                textContent: 'Choose "HTML Props Builder Visual Editor"'
              })
            ]
          }),
          // Section 2: Resource Management (UI + Config)
          new H2({
            textContent: "Resource Management",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "The Resources panel lets you manage your component libraries. Actions here directly affect your project configuration.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new H3({
            textContent: "Adding Resource Directories",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: 'Click the "+" button in the Resources panel to select a folder containing your components.',
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new P({
            textContent: "Technical Effect: This updates your VS Code workspace settings (settings.json) to include the new path:",
            style: {
              marginBottom: "0.5rem",
              color: theme.colors.text,
              fontWeight: "bold",
              fontSize: "0.9rem"
            }
          }),
          new CodeBlock({
            code: `{
  "webBuilder.resourceDirectories": [
    {
      "name": "My Components",
      "path": "./src/components"
    }
  ]
}`
          }),
          new H3({
            textContent: "Creating Components",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: 'Use the category menu (three dots) in the Resources panel to "Create Resource". The wizard guides you through defining the tag name, properties, and base element.',
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new P({
            textContent: "Technical Effect: Generates a new TypeScript file with the component class definition:",
            style: {
              marginBottom: "0.5rem",
              color: theme.colors.text,
              fontWeight: "bold",
              fontSize: "0.9rem"
            }
          }),
          new CodeBlock({
            code: `// Generated file: src/components/MyButton.ts
class MyButton extends HTMLProps(HTMLElement)<MyButtonProps>() {
  static props = {
    label: { type: String, default: '' }
  };
  // ...
}
MyButton.define('my-button');`
          }),
          new H3({
            textContent: "Supported Resource Types",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new Ul({
            style: {
              paddingLeft: "1.5rem",
              marginBottom: "1rem",
              color: "#94a3b8"
            },
            content: [
              new Li({
                content: [
                  new P({
                    textContent: "Custom Components (.ts/.js)",
                    style: {
                      fontWeight: "bold",
                      color: theme.colors.text,
                      display: "inline"
                    }
                  }),
                  new P({
                    textContent: ": Scanned via regex for `customElements.define()` or `HTMLProps`.",
                    style: {
                      display: "inline"
                    }
                  })
                ]
              }),
              new Li({
                content: [
                  new P({
                    textContent: "HTML Templates (.html)",
                    style: {
                      fontWeight: "bold",
                      color: theme.colors.text,
                      display: "inline"
                    }
                  }),
                  new P({
                    textContent: ": Static files treated as insertable templates.",
                    style: {
                      display: "inline"
                    }
                  })
                ]
              })
            ]
          }),
          // Section 3: Visual Editing (UI + Code)
          new H2({
            textContent: "Visual Editing & Code Generation",
            style: {
              fontSize: "1.8rem",
              marginTop: "2rem",
              marginBottom: "1rem"
            }
          }),
          new P({
            textContent: "The visual editor is a WYSIWYG interface that writes standard HTML. It supports editing both static HTML files and the render methods of your .ts/.js web components.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new H3({
            textContent: "Drag & Drop Composition",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Dragging an element from the panel into the editor inserts the corresponding tag into your document.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new P({
            textContent: "Technical Effect: Inserts the HTML tag at the cursor position or drop target. For .ts/.js components, it updates the render method code.",
            style: {
              marginBottom: "0.5rem",
              color: theme.colors.text,
              fontWeight: "bold",
              fontSize: "0.9rem"
            }
          }),
          new CodeBlock({
            code: `<!-- HTML File -->
<div class="container">
  <my-button></my-button>
</div>

// TypeScript Component (html-props)
new Div({
  class: 'container',
  content: [
    new MyButton({})
  ]
})`
          }),
          new H3({
            textContent: "Property Editing",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new P({
            textContent: "Selecting an element populates the Properties panel. Changing values here updates the element attributes in real-time.",
            style: {
              marginBottom: "1rem",
              color: "#94a3b8"
            }
          }),
          new P({
            textContent: "Technical Effect: Updates HTML attributes. For HTMLProps components, these attributes map to reactive props.",
            style: {
              marginBottom: "0.5rem",
              color: theme.colors.text,
              fontWeight: "bold",
              fontSize: "0.9rem"
            }
          }),
          new CodeBlock({
            code: `<!-- HTML File -->
<my-counter count="5"></my-counter>

// TypeScript Component (html-props)
new MyCounter({
  count: 5
})`
          }),
          new H3({
            textContent: "Interface Panels",
            style: {
              fontSize: "1.4rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              color: theme.colors.text
            }
          }),
          new Ul({
            style: {
              paddingLeft: "1.5rem",
              marginBottom: "2rem",
              color: "#94a3b8"
            },
            content: [
              new Li({
                textContent: "Elements: Built-in HTML tags."
              }),
              new Li({
                textContent: "Resources: Your custom components (configured via settings.json)."
              }),
              new Li({
                textContent: "Layers: DOM tree view for reordering."
              }),
              new Li({
                textContent: "Properties: Attribute editor."
              })
            ]
          })
        ]
      });
    }
    return new Article({
      style: {
        flex: "1",
        padding: "3rem 4rem",
        maxWidth: "800px"
      },
      content: [
        new H1({
          textContent: "Introduction",
          style: {
            fontSize: "2.5rem",
            marginBottom: "1.5rem",
            color: theme.colors.text
          }
        }),
        new P({
          textContent: "@html-props/core is a lightweight, zero-dependency library for building reactive Custom Elements. It provides a simple, declarative API for defining properties, handling attributes, and rendering content.",
          style: {
            fontSize: "1.1rem",
            lineHeight: "1.7",
            marginBottom: "2rem",
            color: "#94a3b8"
          }
        }),
        new H2({
          textContent: "Why html-props?",
          style: {
            fontSize: "1.8rem",
            marginTop: "3rem",
            marginBottom: "1rem"
          }
        }),
        new P({
          textContent: "Most web component libraries are either too heavy, require a build step, or introduce complex abstractions. html-props aims to be the sweet spot: simple enough to understand in minutes, but powerful enough for real applications.",
          style: {
            lineHeight: "1.7",
            marginBottom: "1.5rem",
            color: "#94a3b8"
          }
        }),
        new CodeBlock({
          code: `import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  static props = {
    name: { type: String, default: 'World' }
  };

  render() {
    return new Div({ textContent: \`Hello, \${this.name}!\` });
  }
}`
        })
      ]
    });
  }
};
DocsPage.define("docs-page");

// src/landing/App.ts
var App = class extends HTMLPropsMixin(HTMLElement) {
  static props = {
    route: {
      type: String,
      default: "/"
    }
  };
  connectedCallback() {
    super.connectedCallback();
    const handleHashChange = () => {
      const hash = window.location.hash || "#/";
      console.log("Hash changed:", hash);
      let path = hash.substring(1);
      if (path.endsWith("/") && path.length > 1) {
        path = path.slice(0, -1);
      }
      this.route = path;
      console.log("Route updated:", this.route);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  }
  render() {
    if (this.route.startsWith("/docs")) {
      return new DocsPage({
        route: this.route
      });
    }
    return new LandingPage({});
  }
};
App.define("app-root");
