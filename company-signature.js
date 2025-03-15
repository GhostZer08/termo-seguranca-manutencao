// Função para gerar a assinatura da empresa
function generateCompanySignature(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Definir estilo para a assinatura
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    
    // Desenhar a assinatura estilizada "I.A"
    ctx.beginPath();
    
    // Letra I
    ctx.moveTo(20, 20);
    ctx.lineTo(20, 60);
    
    // Traço superior do I
    ctx.moveTo(10, 20);
    ctx.lineTo(30, 20);
    
    // Traço inferior do I
    ctx.moveTo(10, 60);
    ctx.lineTo(30, 60);
    
    // Ponto após o I
    ctx.moveTo(35, 60);
    ctx.arc(35, 60, 2, 0, Math.PI * 2);
    
    // Letra A
    ctx.moveTo(50, 60);
    ctx.lineTo(65, 20);
    ctx.lineTo(80, 60);
    
    // Traço horizontal do A
    ctx.moveTo(57, 40);
    ctx.lineTo(73, 40);
    
    // Aplicar o traço
    ctx.stroke();
    
    // Adicionar texto "Manutenção e Tecnologia" em uma fonte cursiva
    ctx.font = 'italic 12px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText('Manutenção e Tecnologia', 90, 45);
    
    return canvas.toDataURL();
}
