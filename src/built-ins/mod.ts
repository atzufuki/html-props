import { type HTMLPropsElementConstructor, HTMLPropsMixin } from '@html-props/core';

type BuiltIn<T extends new (...args: any[]) => any> = HTMLPropsElementConstructor<T, {}> & Pick<T, keyof T>;

// Document Metadata (Shadow DOM relevant)
export const Style: BuiltIn<typeof HTMLStyleElement> = HTMLPropsMixin(HTMLStyleElement).define('html-style', {
  extends: 'style',
});
export const Link: BuiltIn<typeof HTMLLinkElement> = HTMLPropsMixin(HTMLLinkElement).define('html-link', {
  extends: 'link',
});

// Sections
export const Div: BuiltIn<typeof HTMLDivElement> = HTMLPropsMixin(HTMLDivElement).define('html-div', {
  extends: 'div',
});
export const Section: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-section', {
  extends: 'section',
});
export const Article: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-article', {
  extends: 'article',
});
export const Aside: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-aside', {
  extends: 'aside',
});
export const Header: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-header', {
  extends: 'header',
});
export const Footer: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-footer', {
  extends: 'footer',
});
export const Nav: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-nav', { extends: 'nav' });
export const Main: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-main', { extends: 'main' });
export const Address: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-address', {
  extends: 'address',
});

// Headings
export const Heading1: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h1', {
  extends: 'h1',
});
export const Heading2: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h2', {
  extends: 'h2',
});
export const Heading3: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h3', {
  extends: 'h3',
});
export const Heading4: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h4', {
  extends: 'h4',
});
export const Heading5: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h5', {
  extends: 'h5',
});
export const Heading6: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h6', {
  extends: 'h6',
});

// Text Content
export const Paragraph: BuiltIn<typeof HTMLParagraphElement> = HTMLPropsMixin(HTMLParagraphElement).define('html-p', {
  extends: 'p',
});
export const HorizontalRule: BuiltIn<typeof HTMLHRElement> = HTMLPropsMixin(HTMLHRElement).define('html-hr', {
  extends: 'hr',
});
export const Preformatted: BuiltIn<typeof HTMLPreElement> = HTMLPropsMixin(HTMLPreElement).define('html-pre', {
  extends: 'pre',
});
export const Blockquote: BuiltIn<typeof HTMLQuoteElement> = HTMLPropsMixin(HTMLQuoteElement).define('html-blockquote', {
  extends: 'blockquote',
});
export const OrderedList: BuiltIn<typeof HTMLOListElement> = HTMLPropsMixin(HTMLOListElement).define('html-ol', {
  extends: 'ol',
});
export const UnorderedList: BuiltIn<typeof HTMLUListElement> = HTMLPropsMixin(HTMLUListElement).define('html-ul', {
  extends: 'ul',
});
export const ListItem: BuiltIn<typeof HTMLLIElement> = HTMLPropsMixin(HTMLLIElement).define('html-li', {
  extends: 'li',
});
export const DescriptionList: BuiltIn<typeof HTMLDListElement> = HTMLPropsMixin(HTMLDListElement).define('html-dl', {
  extends: 'dl',
});
export const DescriptionTerm: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-dt', {
  extends: 'dt',
});
export const DescriptionDetails: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-dd', {
  extends: 'dd',
});
export const Figure: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-figure', {
  extends: 'figure',
});
export const Figcaption: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-figcaption', {
  extends: 'figcaption',
});

// Inline Text Semantics
export const Anchor: BuiltIn<typeof HTMLAnchorElement> = HTMLPropsMixin(HTMLAnchorElement).define('html-a', {
  extends: 'a',
});
export const Emphasis: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-em', { extends: 'em' });
export const Strong: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-strong', {
  extends: 'strong',
});
export const Small: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-small', {
  extends: 'small',
});
export const Strikethrough: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-s', {
  extends: 's',
});
export const Cite: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-cite', { extends: 'cite' });
export const Quote: BuiltIn<typeof HTMLQuoteElement> = HTMLPropsMixin(HTMLQuoteElement).define('html-q', {
  extends: 'q',
});
export const Code: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-code', { extends: 'code' });
export const Data: BuiltIn<typeof HTMLDataElement> = HTMLPropsMixin(HTMLDataElement).define('html-data', {
  extends: 'data',
});
export const Time: BuiltIn<typeof HTMLTimeElement> = HTMLPropsMixin(HTMLTimeElement).define('html-time', {
  extends: 'time',
});
export const Variable: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-var', { extends: 'var' });
export const Sample: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-samp', { extends: 'samp' });
export const Keyboard: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-kbd', { extends: 'kbd' });
export const Subscript: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-sub', {
  extends: 'sub',
});
export const Superscript: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-sup', {
  extends: 'sup',
});
export const Italic: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-i', { extends: 'i' });
export const Bold: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-b', { extends: 'b' });
export const Underline: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-u', { extends: 'u' });
export const Mark: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-mark', { extends: 'mark' });
export const Abbr: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-abbr', { extends: 'abbr' });
export const Dfn: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-dfn', { extends: 'dfn' });
export const Ruby: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-ruby', { extends: 'ruby' });
export const RubyText: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-rt', { extends: 'rt' });
export const RubyParenthesis: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-rp', {
  extends: 'rp',
});
export const BidirectionalIsolate: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-bdi', {
  extends: 'bdi',
});
export const BidirectionalOverride: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-bdo', {
  extends: 'bdo',
});
export const Span: BuiltIn<typeof HTMLSpanElement> = HTMLPropsMixin(HTMLSpanElement).define('html-span', {
  extends: 'span',
});
export const LineBreak: BuiltIn<typeof HTMLBRElement> = HTMLPropsMixin(HTMLBRElement).define('html-br', {
  extends: 'br',
});
export const WordBreak: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-wbr', {
  extends: 'wbr',
});

// Image and Multimedia
export const Image: BuiltIn<typeof HTMLImageElement> = HTMLPropsMixin(HTMLImageElement).define('html-img', {
  extends: 'img',
});
export const Audio: BuiltIn<typeof HTMLAudioElement> = HTMLPropsMixin(HTMLAudioElement).define('html-audio', {
  extends: 'audio',
});
export const Video: BuiltIn<typeof HTMLVideoElement> = HTMLPropsMixin(HTMLVideoElement).define('html-video', {
  extends: 'video',
});
export const Source: BuiltIn<typeof HTMLSourceElement> = HTMLPropsMixin(HTMLSourceElement).define('html-source', {
  extends: 'source',
});
export const Track: BuiltIn<typeof HTMLTrackElement> = HTMLPropsMixin(HTMLTrackElement).define('html-track', {
  extends: 'track',
});
export const Map: BuiltIn<typeof HTMLMapElement> = HTMLPropsMixin(HTMLMapElement).define('html-map', {
  extends: 'map',
});
export const Area: BuiltIn<typeof HTMLAreaElement> = HTMLPropsMixin(HTMLAreaElement).define('html-area', {
  extends: 'area',
});

// Embedded Content
export const IFrame: BuiltIn<typeof HTMLIFrameElement> = HTMLPropsMixin(HTMLIFrameElement).define('html-iframe', {
  extends: 'iframe',
});
export const Embed: BuiltIn<typeof HTMLEmbedElement> = HTMLPropsMixin(HTMLEmbedElement).define('html-embed', {
  extends: 'embed',
});
export const Object: BuiltIn<typeof HTMLObjectElement> = HTMLPropsMixin(HTMLObjectElement).define('html-object', {
  extends: 'object',
});
export const Param: BuiltIn<typeof HTMLParamElement> = HTMLPropsMixin(HTMLParamElement).define('html-param', {
  extends: 'param',
});
export const Picture: BuiltIn<typeof HTMLPictureElement> = HTMLPropsMixin(HTMLPictureElement).define('html-picture', {
  extends: 'picture',
});
export const Canvas: BuiltIn<typeof HTMLCanvasElement> = HTMLPropsMixin(HTMLCanvasElement).define('html-canvas', {
  extends: 'canvas',
});
export const NoScript: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-noscript', {
  extends: 'noscript',
});

// Scripting
export const Script: BuiltIn<typeof HTMLScriptElement> = HTMLPropsMixin(HTMLScriptElement).define('html-script', {
  extends: 'script',
});
export const Del: BuiltIn<typeof HTMLModElement> = HTMLPropsMixin(HTMLModElement).define('html-del', {
  extends: 'del',
});
export const Ins: BuiltIn<typeof HTMLModElement> = HTMLPropsMixin(HTMLModElement).define('html-ins', {
  extends: 'ins',
});

// Table Content
export const Table: BuiltIn<typeof HTMLTableElement> = HTMLPropsMixin(HTMLTableElement).define('html-table', {
  extends: 'table',
});
export const Caption: BuiltIn<typeof HTMLTableCaptionElement> = HTMLPropsMixin(HTMLTableCaptionElement).define(
  'html-caption',
  { extends: 'caption' },
);
export const TableHead: BuiltIn<typeof HTMLTableSectionElement> = HTMLPropsMixin(HTMLTableSectionElement).define(
  'html-thead',
  { extends: 'thead' },
);
export const TableBody: BuiltIn<typeof HTMLTableSectionElement> = HTMLPropsMixin(HTMLTableSectionElement).define(
  'html-tbody',
  { extends: 'tbody' },
);
export const TableFoot: BuiltIn<typeof HTMLTableSectionElement> = HTMLPropsMixin(HTMLTableSectionElement).define(
  'html-tfoot',
  { extends: 'tfoot' },
);
export const TableRow: BuiltIn<typeof HTMLTableRowElement> = HTMLPropsMixin(HTMLTableRowElement).define('html-tr', {
  extends: 'tr',
});
export const TableHeader: BuiltIn<typeof HTMLTableCellElement> = HTMLPropsMixin(HTMLTableCellElement).define(
  'html-th',
  { extends: 'th' },
);
export const TableData: BuiltIn<typeof HTMLTableCellElement> = HTMLPropsMixin(HTMLTableCellElement).define('html-td', {
  extends: 'td',
});
export const Col: BuiltIn<typeof HTMLTableColElement> = HTMLPropsMixin(HTMLTableColElement).define('html-col', {
  extends: 'col',
});
export const ColGroup: BuiltIn<typeof HTMLTableColElement> = HTMLPropsMixin(HTMLTableColElement).define(
  'html-colgroup',
  { extends: 'colgroup' },
);

// Forms
export const Button: BuiltIn<typeof HTMLButtonElement> = HTMLPropsMixin(HTMLButtonElement).define('html-button', {
  extends: 'button',
});
export const DataList: BuiltIn<typeof HTMLDataListElement> = HTMLPropsMixin(HTMLDataListElement).define(
  'html-datalist',
  { extends: 'datalist' },
);
export const FieldSet: BuiltIn<typeof HTMLFieldSetElement> = HTMLPropsMixin(HTMLFieldSetElement).define(
  'html-fieldset',
  { extends: 'fieldset' },
);
export const Form: BuiltIn<typeof HTMLFormElement> = HTMLPropsMixin(HTMLFormElement).define('html-form', {
  extends: 'form',
});
export const Input: BuiltIn<typeof HTMLInputElement> = HTMLPropsMixin(HTMLInputElement).define('html-input', {
  extends: 'input',
});
export const Label: BuiltIn<typeof HTMLLabelElement> = HTMLPropsMixin(HTMLLabelElement).define('html-label', {
  extends: 'label',
});
export const Legend: BuiltIn<typeof HTMLLegendElement> = HTMLPropsMixin(HTMLLegendElement).define('html-legend', {
  extends: 'legend',
});
export const Meter: BuiltIn<typeof HTMLMeterElement> = HTMLPropsMixin(HTMLMeterElement).define('html-meter', {
  extends: 'meter',
});
export const OptGroup: BuiltIn<typeof HTMLOptGroupElement> = HTMLPropsMixin(HTMLOptGroupElement).define(
  'html-optgroup',
  { extends: 'optgroup' },
);
export const Option: BuiltIn<typeof HTMLOptionElement> = HTMLPropsMixin(HTMLOptionElement).define('html-option', {
  extends: 'option',
});
export const Output: BuiltIn<typeof HTMLOutputElement> = HTMLPropsMixin(HTMLOutputElement).define('html-output', {
  extends: 'output',
});
export const Progress: BuiltIn<typeof HTMLProgressElement> = HTMLPropsMixin(HTMLProgressElement).define(
  'html-progress',
  { extends: 'progress' },
);
export const Select: BuiltIn<typeof HTMLSelectElement> = HTMLPropsMixin(HTMLSelectElement).define('html-select', {
  extends: 'select',
});
export const TextArea: BuiltIn<typeof HTMLTextAreaElement> = HTMLPropsMixin(HTMLTextAreaElement).define(
  'html-textarea',
  { extends: 'textarea' },
);

// Interactive
export const Details: BuiltIn<typeof HTMLDetailsElement> = HTMLPropsMixin(HTMLDetailsElement).define('html-details', {
  extends: 'details',
});
export const Dialog: BuiltIn<typeof HTMLDialogElement> = HTMLPropsMixin(HTMLDialogElement).define('html-dialog', {
  extends: 'dialog',
});
export const Menu: BuiltIn<typeof HTMLMenuElement> = HTMLPropsMixin(HTMLMenuElement).define('html-menu', {
  extends: 'menu',
});
export const Summary: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-summary', {
  extends: 'summary',
});

// Web Components
export const Slot: BuiltIn<typeof HTMLSlotElement> = HTMLPropsMixin(HTMLSlotElement).define('html-slot', {
  extends: 'slot',
});
export const Template: BuiltIn<typeof HTMLTemplateElement> = HTMLPropsMixin(HTMLTemplateElement).define(
  'html-template',
  { extends: 'template' },
);

// Aliases
export const H1 = Heading1;
export const H2 = Heading2;
export const H3 = Heading3;
export const H4 = Heading4;
export const H5 = Heading5;
export const H6 = Heading6;
export const P = Paragraph;
export const Hr = HorizontalRule;
export const Pre = Preformatted;
export const Ol = OrderedList;
export const Ul = UnorderedList;
export const Li = ListItem;
export const Dl = DescriptionList;
export const Dt = DescriptionTerm;
export const Dd = DescriptionDetails;
export const A = Anchor;
export const Em = Emphasis;
export const S = Strikethrough;
export const Q = Quote;
export const Var = Variable;
export const Samp = Sample;
export const Kbd = Keyboard;
export const Sub = Subscript;
export const Sup = Superscript;
export const I = Italic;
export const B = Bold;
export const U = Underline;
export const Rt = RubyText;
export const Rp = RubyParenthesis;
export const Bdi = BidirectionalIsolate;
export const Bdo = BidirectionalOverride;
export const Br = LineBreak;
export const Wbr = WordBreak;
export const Img = Image;
export const Thead = TableHead;
export const Tbody = TableBody;
export const Tfoot = TableFoot;
export const Tr = TableRow;
export const Th = TableHeader;
export const Td = TableData;
export const Colgroup = ColGroup;
export const Textarea = TextArea;
export const Fieldset = FieldSet;
export const Optgroup = OptGroup;
export const Datalist = DataList;
