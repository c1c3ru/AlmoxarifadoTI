# Troubleshooting: Movimentações Não Aparecendo

## 🔍 Diagnóstico Rápido

### 1. Verificar se você está logado como Admin

**As movimentações recentes só aparecem para usuários com perfil `admin`!**

✅ **Como verificar:**
1. Abra o Console do Navegador (F12)
2. Digite: `localStorage.getItem('user')`
3. Verifique se `"role":"admin"` aparece no resultado

❌ **Se você NÃO for admin:**
- As movimentações não vão aparecer no dashboard (é comportamento esperado)
- Você pode ver suas próprias movimentações em "Histórico" ou "Movimentações"

### 2. Verificar se há movimentações no sistema

1. Vá para a página "Movimentações" ou "Histórico"
2. Se não houver nenhuma movimentação lá, é porque não há movimentações registradas ainda
3. Tente registrar uma movimentação de teste

### 3. Verificar erros no Console

1. Abra o Console do Navegador (F12)
2. Vá para a aba "Console"
3. Procure por erros em vermelho
4. Se houver erro relacionado a `/api/dashboard/recent-movements`, copie a mensagem

### 4. Testar criação de movimentação

1. Vá para "Itens"
2. Selecione um item
3. Clique em "Saída" ou "Entrada"
4. Preencha os dados e confirme
5. Volte ao Dashboard e veja se apareceu

## 🔧 Possíveis Causas

### Causa 1: Usuário não é Admin
**Solução:** Isso é comportamento esperado. Apenas admins veem movimentações de todos os usuários no dashboard.

### Causa 2: Não há movimentações registradas
**Solução:** Registre uma movimentação de teste.

### Causa 3: Erro no backend
**Sintomas:** Erro 500 no console, mensagem de erro ao carregar dashboard
**Solução:** Verifique os logs do servidor

### Causa 4: Cache do navegador
**Solução:** 
1. Pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para recarregar sem cache
2. Ou limpe o cache do navegador

## 📋 Checklist de Verificação

- [ ] Estou logado como admin?
- [ ] Há movimentações registradas no sistema?
- [ ] O console do navegador mostra algum erro?
- [ ] Já tentei recarregar a página sem cache?
- [ ] O servidor está rodando sem erros?

## 🎯 Teste Rápido

Execute este código no Console do Navegador (F12):

```javascript
// Verificar se você é admin
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Usuário:', user.username);
console.log('Perfil:', user.role);
console.log('É admin?', user.role === 'admin');

// Tentar buscar movimentações
fetch('/api/dashboard/recent-movements', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Movimentações:', data);
  console.log('Total:', data.length);
})
.catch(err => console.error('Erro:', err));
```

## 📞 Próximos Passos

Se após verificar tudo acima as movimentações ainda não aparecerem:

1. Copie a saída do teste acima
2. Copie qualquer erro do console
3. Informe se você é admin ou não
4. Informe se há movimentações na página "Histórico"
