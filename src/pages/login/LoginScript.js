const toggleSenha = document.getElementById('toggleSenha');
const inputSenha = document.getElementById('senha');

toggleSenha.addEventListener('click', function () {
    // Alterna entre mostrar e esconder a senha
    const tipo = inputSenha.getAttribute('type') === 'password' ? 'text' : 'password';
    inputSenha.setAttribute('type', tipo);

    // Alterna o ícone do olho
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});