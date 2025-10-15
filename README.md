# Susuwatari - Coelhinhos de Poeira

Uma implementação interativa dos famosos Susuwatari (coelhinhos de poeira) dos filmes do Studio Ghibli, especialmente "A Viagem de Chihiro" e "Meu Vizinho Totoro".

## Funcionalidades

- **Animação Fluida**: Os Susuwatari se movem suavemente pela tela com um movimento sutil de "respiração"
- **Interação com Mouse**: Quando o mouse se aproxima, os coelhinhos fogem em direções aleatórias
- **Regeneração Automática**: Após 2 segundos sem movimento do mouse, novos Susuwatari aparecem para preencher a tela
- **Cursor Customizado**: Cursor personalizado que combina com a estética do projeto
- **Design Responsivo**: Adapta-se a diferentes tamanhos de tela

## Como Usar

1. Abra o arquivo `index.html` em qualquer navegador web moderno
2. Mova o mouse pela tela para ver os Susuwatari fugirem
3. Mantenha o mouse parado por mais de 2 segundos para vê-los retornarem

## Estrutura do Projeto

```
├── index.html          # Página principal com HTML e CSS
├── susuwatari.js       # Lógica JavaScript dos coelhinhos de poeira
└── README.md          # Este arquivo
```

## Tecnologias Utilizadas

- **HTML5**: Estrutura da página
- **CSS3**: Estilização e animações
- **JavaScript ES6+**: Lógica de interação e animação

## Características Técnicas

- **Performance Otimizada**: Usa `requestAnimationFrame` para animações suaves
- **Detecção de Colisão**: Sistema eficiente para detectar proximidade do mouse
- **Gestão de Memória**: Remove partículas que saem da tela para evitar vazamentos
- **Responsividade**: Recria partículas automaticamente quando a janela é redimensionada

## Personalização

Você pode ajustar vários parâmetros no arquivo `susuwatari.js`:

- `fleeDistance`: Distância em que os Susuwatari começam a fugir (padrão: 80px)
- `maxParticles`: Número máximo de partículas na tela (padrão: 50)
- Timeout de mouse parado (padrão: 2000ms)

## Inspiração

Este projeto foi inspirado nos adoráveis Susuwatari dos filmes do Studio Ghibli, criaturas mágicas que vivem em casas abandonadas e fogem quando perturbadas, mas retornam quando tudo fica quieto novamente.