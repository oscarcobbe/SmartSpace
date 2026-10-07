/* The report template is imported as text (see the webpack rule in next.config.mjs). */
declare module "*.html" {
  const content: string;
  export default content;
}
