console.log('Static script execution start');
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded reached');
  const root = document.getElementById('root');
  if (root) {
    root.style.border = '5px solid red';
    root.innerHTML = '<div style="color: red; padding: 20px; font-size: 24px;">Static Script Rendered This</div>';
  }
});
