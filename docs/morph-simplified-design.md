# Yksinkertaistettu Morph-arkkitehtuuri – Suunnittelu

Nykyinen `morph`-implementaatio on monimutkainen ja sisältää useita päällekkäisiä mekanismeja, joita voi olla vaikea
ylläpitää ja debugata. Tämä dokumentti ehdottaa yksinkertaisempaa arkkitehtuuria, joka ratkaisee tunnetut ongelmat
(esim. sivupalkin teksti katoaa resizin aikana).

## Nykyisen implementaation ongelmat

1. **Kaksi erillistä child-morph-funktiota** (`morphChildren` ja `morphChildrenDirect`):
   - Koodi toistetaan, logiikka on vaikea seurata.
   - Molemmat tekevät pohjimmiltaan saman asian.

2. **Monimutkainen matching-algoritmi**:
   - Etsii vastaavuutta myöhemmistä indekseistä (`matchIdx > oldIdx`).
   - Lisää overhead ja epäselvyyttä; usein ei hyödy keyed-datan puuttuessa.

3. **Erilliset synkronointitavat eri paikkoja**:
   - `syncAttributes()`, `syncProperties()`, `syncStyles()`, `textContent`, form-erikoistapaukset.
   - Logiikka on hajautettu, `textContent` jouduttiin lisäämään jälkikäteen.

4. **Custom-element-erityiskohtelu ohittaa child-morphing**:
   - Jos elementillä on `render()`, lapsia ei morffata ollenkaan.
   - Tämä voi jättää lapset epäsynkronoituneiksi, jos renderöinti ei päivity ne.

5. **Monimutkaiset property-keräysmenetelmät**:
   - `collectProperties()` käy läpi prototyyppiketjua ja etsii getters/setters.
   - Hyödyllistä joissakin tapauksissa, mutta lisää kompleksisuutta.

## Ehdotettu yksinkertaistettu design

### Periaatteet

1. **Yksinkertainen in-order matching**: Lapset sovitetaan järjestyksessä ja tagien perusteella, ei myöhemmillä
   indekseillä.
2. **Unified property sync**: Yksi järkevä synkronointimekanismi; estä vain truly readonly/internal props.
3. **Tekstisolmut ensimmäisellä passilla**: Morphaa teksti- ja kommenttisolmut samalla tavalla kuin elementit.
4. **Custom-elementit saavat oman render-cyclensa**: Morphaus päivittää propsit, efektit päivittävät renderöinnin
   (nykyisen kaltainen, mutta selkeämpi).

### Rakenne

```
morph(container, newContent)
  ↓
morphRoot(container, newContent, context)
  • Rakentaa uudet solmut (DocumentFragment → array)
  • Kutsuu morphChildrenInOrder()
  ↓
morphChildrenInOrder(parent, newChildren)
  • Yhtenäinen algoritmi kaikille solmutyypeille
  • Insert, Update, Remove -operaatiot järjestyksessä
  ↓
morphNode(oldNode, newNode)
  • syncNodeContent(): teksti, attribuutit, tyylit, propertyit
  • Ei special-casing; yksi tie
```

### Synkronointimetodi: syncNodeContent()

```typescript
function syncNodeContent(oldNode: Node, newNode: Node): void {
  // 1. Teksti- ja kommenttisolmut
  if (oldNode.nodeType === Node.TEXT_NODE || oldNode.nodeType === Node.COMMENT_NODE) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }

  // 2. Elementit: attribuutit, tyylit, propertyit, sisältö
  const oldEl = oldNode as Element;
  const newEl = newNode as Element;

  // Attribuutit (paitsi 'style')
  syncAttributesFast(oldEl, newEl);

  // Tyylit property-kohtaisesti
  syncStylesFast(oldEl, newEl);

  // Propertyit (ei-readonly, ei-internal)
  syncPropertiesFast(oldEl, newEl);

  // Teksti, jos pelkkä tekstisisältö
  // (Jos morph hoitaa kaikki lapset, tämä on redundantti, mutta turvallisuus)
  if (oldEl.children.length === 0 && oldEl.textContent !== newEl.textContent) {
    oldEl.textContent = newEl.textContent;
  }
}
```

### Child-matching: Yksinkertainen in-order

```typescript
function morphChildrenInOrder(oldParent: Element, newChildren: Node[]): void {
  const oldChildren = Array.from(oldParent.childNodes);

  let oldIdx = 0;
  let newIdx = 0;

  // Sovita ja päivitä olemassa olevat lapset
  while (oldIdx < oldChildren.length && newIdx < newChildren.length) {
    const oldChild = oldChildren[oldIdx];
    const newChild = newChildren[newIdx];

    if (canMorph(oldChild, newChild)) {
      // Sama tagi/tyyppi → morffaa
      morphNode(oldChild, newChild);
      oldIdx++;
      newIdx++;
    } else {
      // Eri tagi → korvaa vanha uudella
      oldParent.replaceChild(newChild, oldChild);
      oldIdx++;
      newIdx++;
    }
  }

  // Lisää loput uudet lapset
  while (newIdx < newChildren.length) {
    oldParent.appendChild(newChildren[newIdx]);
    newIdx++;
  }

  // Poista loput vanhat lapset
  while (oldIdx < oldChildren.length) {
    oldChildren[oldIdx].remove();
    oldIdx++;
  }
}

function canMorph(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === Node.ELEMENT_NODE) {
    return (a as Element).tagName === (b as Element).tagName;
  }
  return true;
}
```

### Property-synkronointi: Yksinkertainen blacklist

```typescript
const SKIP_PROPS = new Set([
  // Readonly DOM properties
  'tagName',
  'nodeName',
  'nodeType',
  'parentNode',
  'childNodes',
  'attributes',
  'ownerDocument',
  'children',
  'shadowRoot',
  'isConnected',
  // Morphing käsittelee nämä erikseen
  'style',
  // Internal/synthetic
  'textContent',
  'innerHTML',
  'outerHTML',
  // Framework-spesifisistä omaisuuksista
  'isUpdatePending',
  'hasUpdated',
  'renderOptions',
  'updateComplete',
]);

function syncPropertiesFast(oldEl: Element, newEl: Element): void {
  // Kerää propertyit vain newEl:stä (instanssitaso)
  const newProps = Object.getOwnPropertyNames(newEl);

  for (const key of newProps) {
    if (SKIP_PROPS.has(key) || key.startsWith('_')) continue;

    try {
      const newValue = (newEl as any)[key];
      if (newValue === undefined || typeof newValue === 'function') continue;

      const oldValue = (oldEl as any)[key];
      if (newValue !== oldValue) {
        (oldEl as any)[key] = newValue;
      }
    } catch {
      // Readonly property
    }
  }

  // Form-field-erikoistapaukset
  if (oldEl instanceof HTMLInputElement && newEl instanceof HTMLInputElement) {
    if (document.activeElement !== oldEl) {
      if (oldEl.value !== newEl.value) oldEl.value = newEl.value;
      if (oldEl.checked !== newEl.checked) oldEl.checked = newEl.checked;
    }
  }
}
```

### Custom-elementit ja render()

**Nykyinen:** Ohita lapsi-morphing, jos `render()` on olemassa.

**Ehdotus:** Sama, mutta selkeämpi:

```typescript
function morphNode(oldNode: Node, newNode: Node): void {
  syncNodeContent(oldNode, newNode);

  // Lapset: ohita custom-elementeille, joilla on render()
  if (oldNode instanceof Element && !(oldNode as any).render) {
    morphChildrenInOrder(oldNode as Element, Array.from((newNode as Element).childNodes));
  }
}
```

## Edut

| Aspekti              | Nykyinen                                           | Yksinkertaistettu              |
| -------------------- | -------------------------------------------------- | ------------------------------ |
| Child-morph logiikka | Kaksi funktiota + matching myöhemmiltä indekseiltä | Yksi funktio, in-order         |
| Property-sync        | Monimutkainen prototyyppi-keräys                   | Vain instanssitaso             |
| TextContent-ongelma  | Erilliset logiikat + SKIP_PROPS-ristiriita         | Integroitu syncNodeContent-iin |
| Ylläpitävyys         | Vaikea seurata                                     | Lineaarinen, selkeä flow       |
| Suorituskyky         | Hieman parempi matching (myöhemmät indeksit)       | Nopeampi (no complex matching) |

## Mahdolliset haitat ja ratkaisut

1. **Ei myöhempiä vastaavuuksia**: Jos lapset järjestyvät uudelleen, morph korvaa sen sijaan, että morffaa.
   - **Ratkaisu**: Lisää `data-morph-key` attribuutti ja käytä sitä vastaavuuden määrityksessä.
   - **Esimerkki**: `<item data-morph-key="item-1">...</item>`

2. **TextContent-synkronointi voi korvata lapset**: Jos oldEl on pelkkää tekstiä ja uudella on lapsia.
   - **Ratkaisu**: Synkronoi `textContent` vain, jos `oldEl.children.length === 0 && newEl.children.length === 0`.

3. **Property-keräys voi mutta ei varmasti saa kaikkia**:
   - **Ratkaisu**: Jos osat käyttävät getters/setters merkittävästi, lisää `data-props` attribuutti tai eksplisiitti
     property-lista.

## Implementointipolku

1. **Refaktoroi `morphChildrenInOrder`**: Yhdistä `morphChildren` ja `morphChildrenDirect`.
2. **Yhdistä synkronointimekanismit**: `syncNodeContent()` ensimmäiseksi.
3. **Testaa**: Varmista sidebar teksti, resize-syklit, form-arvot.
4. **Lisää keyed-support**: Jos tarvitaan (data-morph-key).
5. **Poista legacy-koodi**: Vanha matching-logiikka.

## Yhteenveto

Yksinkertaistettu design:

- **Vähemmän koodia**, **parempi ylläpitävyys**.
- **Lineaarinen flow**: morph → morphRoot → morphChildrenInOrder → morphNode → syncNodeContent.
- **Yksi synkrointimekanismi**, ei split-logiikkaa.
- **Tekstisisältö** integroitu, ei jälkikäteen lisätty.
- **In-order matching** riittää useimmille käyttötapauksille; keyed-tuki voidaan lisätä myöhemmin.
