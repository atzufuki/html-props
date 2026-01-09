import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div, Heading1, Input, ListItem, Span, UnorderedList } from '@html-props/built-ins';
import { Column, Container, Row } from '@html-props/layout';
import { signal } from '@html-props/signals';
import { theme } from './theme.ts';
// import { morph } from '@phlex/morphlex';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export class App extends HTMLPropsMixin(HTMLElement) {
  private todos = signal<Todo[]>([
    { id: 1, text: 'Opi html-props', completed: true },
    { id: 2, text: 'Rakenna sovellus', completed: false },
  ]);
  private inputText = signal('');

  private addTodo() {
    const text = this.inputText().trim();
    if (text) {
      this.todos.update((t) => [...t, { id: Date.now(), text, completed: false }]);
      this.inputText.set('');
    }
  }

  private toggleTodo(id: number) {
    this.todos.update((todos) => todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  private removeTodo(id: number) {
    this.todos.update((todos) => todos.filter((t) => t.id !== id));
  }

  connectedCallback(): void {
    super.connectedCallback();
    const html = document.documentElement;
    html.classList.add('dark');
  }

  render() {
    return new Container({
      style: {
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: theme.colors.secondaryBg,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        fontFamily: theme.fonts.sans,
        color: theme.colors.text,
      },
      content: new Column({
        gap: '20px',
        content: [
          new Heading1({
            textContent: 'Tehtävälista',
            style: { textAlign: 'center', color: theme.colors.accent, margin: '0' },
          }),
          new Row({
            gap: '10px',
            content: [
              new Input({
                placeholder: 'Mitä pitäisi tehdä?',
                value: this.inputText(),
                name: 'todo-input',
                id: 'todo-input',
                oninput: (e: any) => {
                  this.inputText.set(e.target.value);
                },
                onkeydown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    this.addTodo();
                  }
                },
                style: {
                  flex: '1',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: '16px',
                },
              }),
              new Button({
                textContent: 'Lisää',
                onclick: () => this.addTodo(),
                style: {
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.bg,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                },
              }),
            ],
          }),
          new UnorderedList({
            style: { listStyle: 'none', padding: '0', margin: '0' },
            content: this.todos().map((todo) => {
              // console.log(todo.completed);

              return new ListItem({
                id: `todo-${todo.id}`,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  gap: '12px',
                },
                content: [
                  new Row({
                    gap: '12px',
                    style: { flex: '1', alignItems: 'center' },
                    content: [
                      new Input({
                        type: 'checkbox',
                        name: `todo-checkbox-${todo.id}`,
                        id: `todo-checkbox-${todo.id}`,
                        checked: todo.completed,
                        onclick: () => this.toggleTodo(todo.id),
                        style: { width: '20px', height: '20px', cursor: 'pointer' },
                      }),
                      new Span({
                        textContent: todo.text,
                        style: {
                          fontSize: '18px',
                          color: todo.completed ? theme.colors.comment : theme.colors.text,
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          flex: '1',
                        },
                      }),
                    ],
                  }),
                  new Button({
                    textContent: 'Poista',
                    onclick: () => this.removeTodo(todo.id),
                    style: {
                      padding: '6px 12px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    },
                  }),
                ],
              });
            }),
          }),
          this.todos().length > 0
            ? new Row({
              mainAxisAlignment: 'spaceBetween',
              crossAxisAlignment: 'center',
              gap: '10px',
              style: {
                padding: '12px',
                marginTop: '10px',
                borderTop: `2px solid ${theme.colors.border}`,
                color: theme.colors.comment,
                fontSize: '14px',
              },
              content: [
                new Span({ textContent: `${this.todos().filter((t) => !t.completed).length} tehtävää jäljellä` }),
                new Button({
                  textContent: 'Poista tehdyt',
                  onclick: () => this.todos.update((todos) => todos.filter((t) => !t.completed)),
                  style: {
                    background: 'none',
                    border: 'none',
                    color: theme.colors.accent,
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline',
                  },
                }),
              ],
            })
            : null,
          this.todos().length === 0
            ? new Div({
              textContent: 'Ei tehtäviä! Lepää rauhassa.',
              style: { textAlign: 'center', color: theme.colors.comment, fontStyle: 'italic' },
            })
            : null,
        ],
      }),
    });
  }
}

App.define('app-root');
