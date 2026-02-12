
document.addEventListener('DOMContentLoaded', function() {
    const burgerBtn = document.getElementById('burgerBtn');
    const navBar = document.getElementById('navBar');

    burgerBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        navBar.classList.toggle('active');
    });

    const navLinks = navBar.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            burgerBtn.classList.remove('active');
            navBar.classList.remove('active');
        });
    });
});