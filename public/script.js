// Chiudi il menu quando si clicca fuori dal cerchio
window.addEventListener('click', function(event) {
    const profileMenu = document.getElementById('profile-menu');
    const profileCircle = document.querySelector('.profile-circle');
    
    if (!profileCircle.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.style.display = 'none';
    }
});
