// Redaxo CSS: FAQ

export default `
/* FAQ */
.faq-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.faq-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.faq-item__question {
  padding: 1.25rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}
.faq-item__question::-webkit-details-marker { display: none; }
.faq-item__question::after {
  content: '+';
  float: right;
  font-size: 1.25rem;
  color: var(--color-primary);
  transition: transform var(--transition);
}
.faq-item[open] .faq-item__question::after {
  transform: rotate(45deg);
}
.faq-item__answer {
  padding: 0 1.5rem 1.25rem;
  color: var(--color-text-muted);
  line-height: 1.7;
}
`
