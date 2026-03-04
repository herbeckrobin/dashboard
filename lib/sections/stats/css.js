// Redaxo CSS: Statistiken

export default `
/* Statistiken */
.section--stats {
  background: var(--color-surface-alt);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  text-align: center;
}
.stat__value {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  font-family: var(--font-heading);
  letter-spacing: -0.02em;
  color: var(--color-primary);
}
.stat__divider {
  width: 2rem;
  height: 2px;
  background: var(--color-primary);
  margin: 0.75rem auto;
  opacity: 0.25;
  border-radius: 1px;
}
.stat__label {
  display: block;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
}
`
