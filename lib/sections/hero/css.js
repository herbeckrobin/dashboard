// Redaxo CSS: Hero Section

export default `
/* Hero Section */
.section--hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: var(--color-text-inverted);
  padding-top: 6rem;
}
.hero__title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.1;
}
.hero__subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
`
