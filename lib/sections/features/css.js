// Redaxo CSS: Features

export default `
/* Features */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 2rem;
  transition: all var(--transition);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.card__icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 1rem;
}
.card__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.card__text {
  color: var(--color-text-muted);
  line-height: 1.6;
}
`
