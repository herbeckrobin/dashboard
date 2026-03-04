// Redaxo CSS: Galerie

export default `
/* Galerie */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
.gallery-item {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 2rem;
  min-height: 200px;
  display: flex;
  align-items: flex-end;
  transition: all var(--transition);
  overflow: hidden;
}
.gallery-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.gallery-item__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.gallery-item__desc {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
`
