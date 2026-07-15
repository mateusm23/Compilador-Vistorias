import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import './RichTextEditor.css';

const FONT_SIZES = [
  { label: 'Pequeno', value: '11px' },
  { label: 'Normal', value: '13px' },
  { label: 'Médio', value: '16px' },
  { label: 'Grande', value: '20px' },
  { label: 'Título', value: '26px' },
];

const TEXT_COLORS = ['#0B0B0B', '#1A2B45', '#1A6EE8', '#217A3C', '#B91C1C', '#C05621'];
const HIGHLIGHT_COLORS = ['#FFF4A3', '#D4EDDA', '#FEE2E2', '#DCE1EA'];

export default function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  if (!editor) return null;

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </button>
        <button type="button" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </button>
        <button type="button" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>S</u>
        </button>

        <span className="rte-sep" />

        <select onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()} defaultValue="13px">
          {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <span className="rte-sep" />

        {TEXT_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className="rte-swatch"
            style={{ background: color }}
            onClick={() => editor.chain().focus().setColor(color).run()}
            title="Cor do texto"
          />
        ))}

        <span className="rte-sep" />

        {HIGHLIGHT_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className="rte-swatch rte-swatch-highlight"
            style={{ background: color }}
            onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
            title="Marca-texto"
          />
        ))}

        <span className="rte-sep" />

        <button type="button" className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('left').run()}>⟸</button>
        <button type="button" className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('center').run()}>⟺</button>
        <button type="button" className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('right').run()}>⟹</button>
      </div>

      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
