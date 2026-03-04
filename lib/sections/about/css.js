// Redaxo CSS: Ueber uns

export default `
/* Ueber uns */
.about__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}
@media (max-width: 768px) {
  .about__grid { grid-template-columns: 1fr; gap: 2rem; }
}
.about__text {
  color: var(--color-text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
  margin-top: 1rem;
}
.about__highlights { display: flex; flex-direction: column; gap: 1rem; }
.highlight-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}
.highlight-item__check {
  color: var(--color-primary);
  font-weight: bold;
  font-size: 1.2rem;
}
`
