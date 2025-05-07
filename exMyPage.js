document.querySelectorAll('.bell').forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        button.textContent = button.classList.contains('active') ? '🔔' : '🔕';
    });
});

document.querySelectorAll('.remove').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.closest('.favorite-item');
        item.remove(); // 실제에선 서버에도 삭제 요청해야 함
    });
});
