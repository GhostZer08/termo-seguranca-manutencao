# Sistema de Termo de Segurança para Manutenção de Computadores

Este é um sistema web para geração de termos de segurança para lojas de manutenção de computadores. O sistema permite criar, visualizar e gerenciar termos de segurança para equipamentos deixados para manutenção.

## Funcionalidades

- Preenchimento de formulário com dados do cliente e do equipamento
- Assinatura digital do cliente
- Geração de PDF do termo de segurança
- Armazenamento local dos termos usando IndexedDB
- Consulta de termos por CPF do cliente
- Visualização e download de termos salvos anteriormente

## Tecnologias Utilizadas

- HTML5, CSS3 e JavaScript puro
- IndexedDB para armazenamento local
- html2canvas para captura de elementos HTML
- jsPDF para geração de arquivos PDF

## Como Usar

1. Abra o arquivo `index.html` em um navegador moderno (Chrome, Firefox, Edge, etc.)
2. Na aba "Novo Termo", preencha todos os dados solicitados:
   - Informações do cliente
   - Detalhes do equipamento
   - Descrição do problema e observações
   - Assinatura digital
3. Clique em "Gerar Termo" para criar o PDF
4. Visualize o termo gerado e escolha entre:
   - Baixar o PDF
   - Salvar no sistema local
5. Para consultar termos salvos, vá para a aba "Consultar Termos" e digite o CPF do cliente

## Estrutura do Termo

O termo de segurança gerado segue o formato padrão de "TERMO DE SEGURANÇA E ENTREGA DE EQUIPAMENTOS" com layout de duas páginas, incluindo:

1. Cabeçalho com título
2. Seções:
   - Objeto
   - Obrigações das Partes
   - Devolução de Equipamentos
   - Proteção de Dados
   - Equipamentos (detalhes do equipamento)
3. Assinatura digital do cliente
4. Data e hora da assinatura

## Observações Importantes

- O sistema funciona inteiramente no navegador, sem necessidade de servidor
- Os termos são armazenados localmente no navegador do usuário através do IndexedDB
- É recomendável usar um navegador atualizado para melhor compatibilidade
- Para manter os dados salvos, não limpe os dados de navegação do seu navegador

## Limitações

- O armazenamento é local (no navegador), então os termos não são compartilhados entre dispositivos
- O tamanho total de armazenamento depende das limitações do navegador
- A assinatura digital é baseada em canvas e não possui validação criptográfica

## Requisitos do Sistema

- Navegador web moderno com suporte a JavaScript, IndexedDB, Canvas API
- Espaço de armazenamento local disponível no navegador
