# 📚 Revisão Espaçada - Plugin Chrome

Um plugin para Google Chrome que implementa o sistema de repetição espaçada para estudos, similar ao Anki. Os cartões aparecem automaticamente no canto superior esquerdo do navegador em intervalos configuráveis.

## ✨ Funcionalidades

- **Cartões de Estudo**: Interface limpa e intuitiva para revisar conteúdo
- **Repetição Espaçada**: Algoritmo inteligente que prioriza cartões com mais erros
- **Configuração Flexível**: Intervalos personalizáveis (1-60 minutos)
- **Gerenciamento Completo**: Adicionar, editar, excluir e organizar cartões
- **Categorização**: Organize cartões por categorias (Inglês, História, etc.)
- **Estatísticas**: Acompanhe seu progresso e taxa de acerto
- **Importar/Exportar**: Backup e sincronização de dados
- **Interface Arrastável**: Mova os cartões pela tela conforme necessário

## 🚀 Como Instalar

### Instalação Manual (Modo Desenvolvedor)

1. **Baixe os arquivos**: Clone ou baixe este repositório
2. **Abra o Chrome**: Vá para `chrome://extensions/`
3. **Ative o modo desenvolvedor**: Toggle no canto superior direito
4. **Carregue a extensão**: Clique em "Carregar sem compactação" e selecione a pasta do projeto
5. **Pronto!**: O ícone aparecerá na barra de extensões

## 📖 Como Usar

### Configuração Inicial

1. **Clique no ícone** da extensão na barra do Chrome
2. **Adicione cartões** na aba "➕ Adicionar":
   - Digite a pergunta/palavra
   - Digite a resposta correta
   - Adicione uma dica (opcional)
   - Escolha uma categoria (opcional)
3. **Configure o intervalo** na aba "⚙️ Configurações"
4. **Ative as notificações** para começar a receber cartões

### Durante o Estudo

Quando um cartão aparecer:

1. **Leia a pergunta** e tente responder mentalmente
2. **Clique em "💡 Dica"** se precisar de ajuda
3. **Clique em "🔄 Virar"** para ver a resposta
4. **Marque se acertou**:
   - **✅ Acertei**: O cartão será revisado em um intervalo maior
   - **❌ Errei**: O cartão aparecerá novamente em breve

### Gerenciamento de Cartões

- **Visualizar todos**: Aba "📋 Gerenciar"
- **Buscar**: Use a barra de pesquisa
- **Filtrar**: Por categoria
- **Editar**: Clique no ícone ✏️
- **Excluir**: Clique no ícone 🗑️

## 🧠 Algoritmo de Repetição Espaçada

O plugin usa um algoritmo inteligente que:

- **Prioriza cartões com mais erros**: Maior chance de aparecer
- **Aumenta intervalos para acertos**: Cartões dominados aparecem menos
- **Considera tempo desde última revisão**: Cartões antigos têm prioridade
- **Calcula taxa de sucesso**: Cartões com 80%+ de acerto são considerados dominados

### Intervalos Automáticos

- **Taxa ≥ 90%**: 1 semana
- **Taxa ≥ 70%**: 3 dias  
- **Taxa ≥ 50%**: 1 dia
- **Taxa < 50%**: 4 horas
- **Erro**: 30 minutos

## ⚙️ Configurações Disponíveis

- **Ativar/Desativar**: Liga/desliga as notificações
- **Intervalo**: 1-60 minutos entre cartões
- **Cartões por sessão**: 1-20 cartões por vez
- **Backup**: Exportar/importar dados em JSON

## 📊 Estatísticas

- **Total**: Número total de cartões
- **Pendentes**: Cartões que precisam ser revisados
- **Dominados**: Cartões com alta taxa de acerto (≥80% e ≥3 tentativas)

## 🔧 Estrutura do Projeto

```
revisao-espacada/
├── manifest.json          # Configuração da extensão
├── background.js          # Service worker (alarmes e lógica)
├── content.js            # Script injetado nas páginas
├── styles.css            # Estilos dos cartões
├── popup.html            # Interface de configuração
├── popup.css             # Estilos do popup
├── popup.js              # Lógica do popup
├── icon16.png            # Ícone 16x16
├── icon48.png            # Ícone 48x48
├── icon128.png           # Ícone 128x128
└── README.md             # Este arquivo
```

## 🎨 Personalização

O plugin foi desenvolvido com design moderno e responsivo:

- **Cores**: Gradiente azul/roxo (#667eea → #764ba2)
- **Tipografia**: System fonts para melhor performance
- **Animações**: Transições suaves e feedback visual
- **Responsivo**: Funciona em diferentes tamanhos de tela

## 🔒 Privacidade

- **Dados locais**: Tudo é armazenado no seu navegador
- **Sem servidor**: Não enviamos dados para lugar nenhum
- **Sem rastreamento**: Não coletamos informações pessoais
- **Código aberto**: Você pode verificar todo o código

## 🐛 Solução de Problemas

### Cartões não aparecem
- Verifique se as notificações estão ativadas
- Confirme se há cartões cadastrados
- Verifique se o intervalo não está muito alto

### Plugin não funciona
- Recarregue a extensão em `chrome://extensions/`
- Verifique se não há erros no console
- Tente desativar outras extensões

### Dados perdidos
- Use a função de exportar regularmente
- Os dados ficam no storage local do Chrome
- Limpar dados do navegador apaga os cartões

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir melhorias
- Enviar pull requests
- Compartilhar feedback

---

**Desenvolvido com ❤️ para facilitar seus estudos!**