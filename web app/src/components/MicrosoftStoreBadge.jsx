/**
 * Official Microsoft Store interactive badge (`<ms-store-badge>` web component).
 * Loaded via https://get.microsoft.com/badge/ms-store-badge.bundled.js in index.html.
 */
export default function MicrosoftStoreBadge({
  id,
  className = '',
  productId = '9n371mqb4bs7',
  productName = 'Quick Pill',
  windowMode = 'direct',
  theme = 'auto',
  size = 'large',
  language = 'en-us',
  animation = 'on',
}) {
  const wrapClasses = ['ms-store-badge-wrap', className].filter(Boolean).join(' ');

  return (
    <div className={wrapClasses}>
      <ms-store-badge
        id={id}
        productid={productId}
        productname={productName}
        window-mode={windowMode}
        theme={theme}
        size={size}
        language={language}
        animation={animation}
      />
    </div>
  );
}
