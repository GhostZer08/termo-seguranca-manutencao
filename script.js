// Inicialização do banco de dados IndexedDB
let db;
const dbName = 'SecurityTermsDB';
const dbVersion = 1;

// Inicializar o banco de dados
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Banco de dados aberto com sucesso');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Criar tabela de termos se não existir
            if (!db.objectStoreNames.contains('terms')) {
                const termsStore = db.createObjectStore('terms', { keyPath: 'id', autoIncrement: true });
                
                // Criar índices para busca
                termsStore.createIndex('clientCpf', 'clientCpf', { unique: false });
                termsStore.createIndex('date', 'date', { unique: false });
                termsStore.createIndex('equipmentType', 'equipmentType', { unique: false });
                
                console.log('Banco de dados criado com sucesso');
            }
        };
    });
}

// Salvar termo no banco de dados
function saveTerm(termData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['terms'], 'readwrite');
        const termsStore = transaction.objectStore('terms');
        
        const request = termsStore.add(termData);
        
        request.onsuccess = (event) => {
            console.log('Termo salvo com sucesso, ID:', event.target.result);
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            console.error('Erro ao salvar termo:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Buscar termos por CPF
function searchTermsByCpf(cpf) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['terms'], 'readonly');
        const termsStore = transaction.objectStore('terms');
        const cpfIndex = termsStore.index('clientCpf');
        
        const request = cpfIndex.getAll(cpf);
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            console.error('Erro ao buscar termos:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Buscar termo por ID
function getTermById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['terms'], 'readonly');
        const termsStore = transaction.objectStore('terms');
        
        const request = termsStore.get(Number(id));
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            console.error('Erro ao buscar termo:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Variáveis globais
let signaturePad;
let companySignatureImg;

// Objeto para o pad de assinatura
const SignaturePad = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    
    init: function() {
        this.canvas = document.getElementById('signatureCanvas');
        if (!this.canvas) {
            console.error('Canvas de assinatura não encontrado');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000';
        
        // Limpar o canvas
        this.clear();
        
        // Adicionar event listeners para desenho
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Suporte para touch
        this.canvas.addEventListener('touchstart', this.startDrawingTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.drawTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    },
    
    startDrawing: function(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    },
    
    startDrawingTouch: function(e) {
        e.preventDefault();
        if (e.touches.length !== 1) return;
        
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.lastX = touch.clientX - rect.left;
        this.lastY = touch.clientY - rect.top;
    },
    
    draw: function(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        
        this.lastX = currentX;
        this.lastY = currentY;
    },
    
    drawTouch: function(e) {
        e.preventDefault();
        if (!this.isDrawing || e.touches.length !== 1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        
        this.lastX = currentX;
        this.lastY = currentY;
    },
    
    stopDrawing: function() {
        this.isDrawing = false;
    },
    
    clear: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    
    isEmpty: function() {
        const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i + 3] !== 0) return false;
        }
        return true;
    },
    
    getSignatureImage: function() {
        return this.isEmpty() ? '' : this.toDataURL();
    },
    
    toDataURL: function() {
        return this.canvas.toDataURL('image/png');
    }
};

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inicializar o banco de dados
        await initDatabase();
        
        // Inicializar o pad de assinatura
        signaturePad = SignaturePad;
        signaturePad.init();
        
        // Gerar a assinatura da empresa
        initCompanySignature();
        
        // Configurar as abas
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                showTab(tabId);
            });
        });
        
        // Mostrar a aba de cadastro por padrão
        showTab('register');
        
        // Adicionar event listeners
        document.getElementById('securityTermForm').addEventListener('submit', handleFormSubmit);
        document.getElementById('clearSignatureBtn').addEventListener('click', clearSignature);
        document.getElementById('generatePdfBtn').addEventListener('click', generatePDF);
        document.getElementById('saveTermBtn').addEventListener('click', saveTerm);
        document.getElementById('searchBtn').addEventListener('click', searchTerms);
        document.getElementById('closePdfModalBtn').addEventListener('click', closePdfModal);
        document.getElementById('equipmentType').addEventListener('change', toggleOtherEquipment);
        document.getElementById('brand').addEventListener('change', toggleOtherBrand);
        document.getElementById('addAccessoryBtn').addEventListener('click', addAccessoryField);
        document.getElementById('addServiceBtn').addEventListener('click', addServiceField);
        
        // Configurar o campo de CPF para formatação automática
        document.getElementById('clientCpf').addEventListener('input', function() {
            this.value = formatCpf(this.value);
        });
        
        // Configurar o campo de telefone para formatação automática
        document.getElementById('clientPhone').addEventListener('input', function() {
            this.value = formatPhone(this.value);
        });
        
        // Verificar se há parâmetros na URL para carregar um termo específico
        const urlParams = new URLSearchParams(window.location.search);
        const termId = urlParams.get('id');
        if (termId) {
            loadTermById(termId);
        }
        
        // Configurar os listeners iniciais dos selects de acessórios
        setupInitialAccessoryListeners();
        
        // Configurar os listeners iniciais dos selects de serviços
        setupInitialServiceListeners();
        
        // Adicionar event listener para calcular o valor total quando qualquer valor de serviço mudar
        document.addEventListener('input', function(e) {
            if (e.target && e.target.classList.contains('service-value')) {
                calculateTotalValue();
            }
        });
        
        // Inicializar o formulário
        initForm();
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
    }
});

// Inicializar a assinatura da empresa
function initCompanySignature() {
    const canvas = document.getElementById('companySignatureCanvas');
    if (!canvas) {
        console.error('Canvas para assinatura da empresa não encontrado');
        return '';
    }
    
    companySignatureImg = generateCompanySignature(canvas);
    console.log('Assinatura da empresa gerada com sucesso');
    return companySignatureImg;
}

// Função para formatar CPF
function formatCpf(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length > 11) cpf = cpf.substring(0, 11);
    if (cpf.length > 9) cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    else if (cpf.length > 6) cpf = cpf.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    else if (cpf.length > 3) cpf = cpf.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return cpf;
}

// Função para formatar telefone
function formatPhone(phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length > 11) phone = phone.substring(0, 11);
    if (phone.length > 10) phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (phone.length > 6) phone = phone.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    else if (phone.length > 2) phone = phone.replace(/(\d{2})(\d{1,5})/, '($1) $2');
    return phone;
}

// Função para formatar data
function formatDate(date) {
    return date.toLocaleDateString('pt-BR');
}

// Função para formatar data e hora
function formatDateTime(date) {
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

// Função para mostrar uma aba
function showTab(tabId) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remover a classe active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar a aba selecionada
    document.getElementById(tabId + 'Tab').style.display = 'block';
    
    // Adicionar a classe active ao botão selecionado
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// Função para alternar a visibilidade do campo "Outro equipamento"
function toggleOtherEquipment() {
    const equipmentType = document.getElementById('equipmentType');
    const otherEquipmentContainer = document.getElementById('otherEquipmentContainer');
    const otherEquipment = document.getElementById('otherEquipment');
    
    if (equipmentType.value === 'Outro') {
        otherEquipmentContainer.style.display = 'block';
        otherEquipment.setAttribute('required', 'required');
    } else {
        otherEquipmentContainer.style.display = 'none';
        otherEquipment.removeAttribute('required');
    }
}

// Função para alternar a visibilidade do campo "Outra marca"
function toggleOtherBrand() {
    const brand = document.getElementById('brand');
    const otherBrandContainer = document.getElementById('otherBrandContainer');
    const otherBrand = document.getElementById('otherBrand');
    
    if (brand.value === 'Outra') {
        otherBrandContainer.style.display = 'block';
        otherBrand.setAttribute('required', 'required');
    } else {
        otherBrandContainer.style.display = 'none';
        otherBrand.removeAttribute('required');
    }
}

// Função para limpar a assinatura
function clearSignature() {
    signaturePad.clear();
}

// Função para lidar com o envio do formulário
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Verificar se a assinatura foi feita
    if (signaturePad.isEmpty()) {
        alert('Por favor, assine o documento antes de prosseguir.');
        return;
    }
    
    // Mostrar os botões de ação
    document.getElementById('actionButtons').style.display = 'block';
}

// Função para preencher o template do termo com os dados do formulário
function fillTermTemplate() {
    // Preencher dados do cliente
    document.getElementById('termClientName').textContent = document.getElementById('clientName').value;
    document.getElementById('termClientCpf').textContent = document.getElementById('clientCpf').value;
    document.getElementById('termClientPhone').textContent = document.getElementById('clientPhone').value;
    document.getElementById('termClientEmail').textContent = document.getElementById('clientEmail').value;
    document.getElementById('termClientAddress').textContent = document.getElementById('clientAddress').value;
    
    // Preencher dados do equipamento
    let equipmentType = document.getElementById('equipmentType').value;
    if (equipmentType === 'Outro') {
        equipmentType = document.getElementById('otherEquipment').value;
    }
    document.getElementById('termEquipmentType').textContent = equipmentType;
    
    let brand = document.getElementById('brand').value;
    if (brand === 'Outra') {
        brand = document.getElementById('otherBrand').value;
    }
    document.getElementById('termBrand').textContent = brand;
    
    document.getElementById('termSerialNumber').textContent = document.getElementById('serialNumber').value;
    
    // Processar acessórios selecionados
    const accessories = collectAccessories();
    const accessoriesText = accessories.length > 0 ? accessories.join(', ') : 'Nenhum';
    document.getElementById('termAccessories').textContent = accessoriesText;
    
    // Processar serviços e orçamento
    const services = collectServices();
    let servicesHtml = '';
    
    if (services.length > 0) {
        servicesHtml += '<table class="services-table"><tr><th>Serviço</th><th>Valor</th></tr>';
        services.forEach(service => {
            servicesHtml += `<tr><td>${service.name}</td><td>${service.formattedValue}</td></tr>`;
        });
        
        // Adicionar linha do total
        const totalValue = document.getElementById('totalValue').value;
        servicesHtml += `<tr class="total-row"><td><strong>Total</strong></td><td><strong>R$ ${totalValue}</strong></td></tr>`;
        servicesHtml += '</table>';
    } else {
        servicesHtml = 'Nenhum serviço adicionado';
    }
    
    const termServicesElement = document.getElementById('termServices');
    if (termServicesElement) {
        termServicesElement.innerHTML = servicesHtml;
    } else {
        console.error('Elemento termServices não encontrado!');
    }
    
    // Preencher descrição do problema e observações
    let problemDescription = '';
    const problemType = document.getElementById('problemType').value;
    const problemDetails = document.getElementById('problemDescription').value;
    
    if (problemType) {
        if (problemType === 'Outro') {
            problemDescription = problemDetails;
        } else if (problemDetails) {
            problemDescription = `${problemType}: ${problemDetails}`;
        } else {
            problemDescription = problemType;
        }
    } else {
        problemDescription = problemDetails;
    }
    
    document.getElementById('termProblemDescription').textContent = problemDescription;
    document.getElementById('termObservations').textContent = document.getElementById('observations').value;
    
    // Preencher a data atual
    const currentDate = new Date();
    document.getElementById('currentDate').textContent = formatDate(currentDate);
    document.getElementById('signatureDateTime').textContent = formatDateTime(currentDate);
    
    // Adicionar a assinatura do cliente
    const clientSignatureImg = document.getElementById('clientSignatureImg');
    clientSignatureImg.src = signaturePad.toDataURL();
    clientSignatureImg.style.width = '100%';
    clientSignatureImg.style.height = '100%';
    clientSignatureImg.style.objectFit = 'contain';
    clientSignatureImg.style.objectPosition = 'center bottom';
    
    // Adicionar a assinatura da empresa
    const companySignatureElement = document.getElementById('companySignatureImg');
    if (companySignatureElement) {
        companySignatureElement.src = companySignatureImg;
        companySignatureElement.style.width = '100%';
        companySignatureElement.style.height = '100%';
        companySignatureElement.style.objectFit = 'contain';
        companySignatureElement.style.objectPosition = 'center bottom';
    } else {
        console.error('Elemento de assinatura da empresa não encontrado');
    }
}

// Função para coletar todos os acessórios selecionados
function collectAccessories() {
    const accessoryItems = document.querySelectorAll('.accessory-item');
    const accessories = [];
    
    accessoryItems.forEach(item => {
        const select = item.querySelector('.accessory-select');
        const otherInput = item.querySelector('.other-accessory');
        
        if (select.value) {
            if (select.value === 'Outro' && otherInput.value.trim()) {
                accessories.push(otherInput.value.trim());
            } else if (select.value !== 'Outro') {
                accessories.push(select.value);
            }
        }
    });
    
    return accessories;
}

// Função para coletar todos os serviços
function collectServices() {
    const serviceItems = document.querySelectorAll('.service-item');
    const services = [];
    
    serviceItems.forEach(item => {
        const select = item.querySelector('.service-select');
        const otherInput = item.querySelector('.other-service');
        const valueInput = item.querySelector('.service-value');
        
        if (select.value) {
            let serviceName = select.value;
            if (serviceName === 'Outro' && otherInput.value.trim()) {
                serviceName = otherInput.value.trim();
            }
            
            const value = parseFloat(valueInput.value) || 0;
            const formattedValue = value.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            services.push({
                name: serviceName,
                value: value,
                formattedValue: formattedValue
            });
        }
    });
    
    return services;
}

// Função para gerar o PDF
function generatePDF() {
    // Verificar se o formulário está preenchido corretamente
    if (!document.getElementById('securityTermForm').checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    // Verificar se a assinatura foi feita
    if (signaturePad.isEmpty()) {
        alert('Por favor, assine o documento antes de gerar o PDF.');
        return;
    }
    
    // Obter o nome do cliente para o nome do arquivo
    const clientName = document.getElementById('clientName').value;
    const fileName = `Termo de ${clientName}`;
    
    // Preencher o template com os dados do formulário
    fillTermTemplate();
    
    // Mostrar o modal
    const modal = document.getElementById('pdfModal');
    modal.style.display = 'block';
    
    // Limpar a área de visualização e mostrar mensagem de carregamento
    const pdfPreview = document.getElementById('pdfPreview');
    pdfPreview.innerHTML = '<div class="loading-message">Aguarde a geração do PDF...</div>';
    
    // Tornar o template visível para processamento
    const termTemplate = document.getElementById('termTemplate');
    termTemplate.style.display = 'block';
    
    // Processar a página do termo
    const page1 = document.getElementById('page1');
    
    // Garantir que a página esteja visível
    page1.style.display = 'block';
    
    // Pré-carregar todas as imagens para evitar problemas de tainted canvas
    const images = page1.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve, reject) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
                img.onerror = reject;
            }
        });
    });
    
    // Usar setTimeout para dar tempo ao navegador para renderizar os elementos
    setTimeout(() => {
        try {
            // Verificar se jsPDF está disponível
            if (typeof window.jspdf === 'undefined') {
                throw new Error('Biblioteca jsPDF não carregada corretamente');
            }
            
            // Aguardar o carregamento de todas as imagens antes de prosseguir
            Promise.all(imagePromises)
                .then(() => {
                    // Inicializar o PDF
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    
                    // Capturar a página com configurações aprimoradas
                    return html2canvas(page1, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: 'white',
                        imageTimeout: 15000,
                        logging: true,
                        onclone: function(clonedDoc) {
                            // Garantir que as imagens no clone tenham crossorigin definido
                            const clonedImages = clonedDoc.querySelectorAll('img');
                            clonedImages.forEach(img => {
                                img.setAttribute('crossorigin', 'anonymous');
                            });
                        }
                    }).then(function(canvas) {
                        // Adicionar a página ao PDF
                        try {
                            const imgData = canvas.toDataURL('image/jpeg', 1.0);
                            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
                            
                            // Gerar o PDF
                            window.pdfData = pdf.output('datauristring');
                            
                            // Exibir o PDF no preview
                            pdfPreview.innerHTML = `<iframe src="${window.pdfData}" width="100%" height="500px"></iframe>`;
                            
                            // Adicionar botão para download com o nome personalizado
                            const downloadButton = document.createElement('button');
                            downloadButton.className = 'btn-primary';
                            downloadButton.style.marginTop = '10px';
                            downloadButton.textContent = 'Baixar PDF';
                            downloadButton.onclick = function() {
                                // Criar um link temporário para download
                                const link = document.createElement('a');
                                link.href = window.pdfData;
                                link.download = `${fileName}.pdf`;
                                link.click();
                            };
                            pdfPreview.appendChild(downloadButton);
                            
                            // Esconder o template novamente
                            termTemplate.style.display = 'none';
                            
                            console.log('PDF gerado com sucesso!');
                        } catch (canvasError) {
                            console.error('Erro ao processar canvas:', canvasError);
                            alert('Erro ao processar o canvas: ' + canvasError.message);
                            termTemplate.style.display = 'none';
                            pdfPreview.innerHTML = `<div class="loading-message" style="color: red;">Erro ao processar o canvas: ${canvasError.message}</div>`;
                        }
                    });
                })
                .catch(function(error) {
                    console.error('Erro ao processar página:', error);
                    alert('Erro ao gerar o PDF: ' + error.message);
                    termTemplate.style.display = 'none';
                    pdfPreview.innerHTML = `<div class="loading-message" style="color: red;">Erro ao gerar o PDF: ${error.message}</div>`;
                });
        } catch (error) {
            console.error('Erro ao inicializar o PDF:', error);
            alert('Erro ao inicializar o PDF: ' + error.message);
            termTemplate.style.display = 'none';
            
            // Limpar o preview e mostrar mensagem de erro
            pdfPreview.innerHTML = `<div class="loading-message" style="color: red;">Erro ao gerar o PDF: ${error.message}</div>`;
        }
    }, 500);
}

// Função para fechar o modal do PDF
function closePdfModal() {
    document.getElementById('pdfModal').style.display = 'none';
}

// Função para salvar o termo no banco de dados
function saveTerm() {
    // Verificar se o PDF foi gerado
    if (!window.pdfData) {
        alert('Por favor, gere o PDF antes de salvar.');
        return;
    }
    
    // Processar acessórios selecionados
    const accessories = collectAccessories();
    const accessoriesText = accessories.length > 0 ? accessories.join(', ') : 'Nenhum';
    
    // Processar serviços
    const services = collectServices();
    const totalValue = parseFloat(document.getElementById('totalValue').value.replace(/\./g, '').replace(',', '.')) || 0;
    
    // Coletar os dados do formulário
    const formData = {
        clientName: document.getElementById('clientName').value,
        clientCpf: document.getElementById('clientCpf').value.replace(/\D/g, ''),
        clientPhone: document.getElementById('clientPhone').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientAddress: document.getElementById('clientAddress').value,
        
        equipmentType: document.getElementById('equipmentType').value === 'Outro' 
            ? document.getElementById('otherEquipment').value 
            : document.getElementById('equipmentType').value,
        brand: document.getElementById('brand').value === 'Outra' 
            ? document.getElementById('otherBrand').value 
            : document.getElementById('brand').value,
        serialNumber: document.getElementById('serialNumber').value,
        accessories: accessoriesText,
        
        services: services,
        totalValue: totalValue,
        
        problemDescription: document.getElementById('problemDescription').value,
        observations: document.getElementById('observations').value,
        
        signature: signaturePad.toDataURL(),
        companySignature: companySignatureImg,
        
        date: new Date(),
        pdfData: window.pdfData
    };
    
    // Salvar no banco de dados
    const transaction = db.transaction(['terms'], 'readwrite');
    const termsStore = transaction.objectStore('terms');
    const request = termsStore.add(formData);
    
    request.onsuccess = function() {
        alert('Termo salvo com sucesso!');
        resetForm();
    };
    
    request.onerror = function(event) {
        alert('Erro ao salvar o termo: ' + event.target.error);
    };
}

// Função para resetar o formulário
function resetForm() {
    document.getElementById('clientForm').reset();
    signaturePad.clear();
    
    // Resetar os campos dinâmicos
    document.getElementById('otherEquipmentContainer').style.display = 'none';
    document.getElementById('otherBrandContainer').style.display = 'none';
    
    // Resetar os acessórios para apenas um item
    const accessoriesContainer = document.getElementById('accessoriesContainer');
    const accessoryItems = accessoriesContainer.querySelectorAll('.accessory-item');
    
    // Manter apenas o primeiro item e resetar seu valor
    if (accessoryItems.length > 0) {
        const firstItem = accessoryItems[0];
        const select = firstItem.querySelector('.accessory-select');
        const otherInput = firstItem.querySelector('.other-accessory');
        
        select.value = '';
        otherInput.value = '';
        otherInput.style.display = 'none';
        
        // Remover todos os outros itens
        for (let i = 1; i < accessoryItems.length; i++) {
            accessoriesContainer.removeChild(accessoryItems[i]);
        }
    }
    
    // Resetar os serviços para apenas um item
    const servicesContainer = document.getElementById('servicesContainer');
    const serviceItems = servicesContainer.querySelectorAll('.service-item');
    
    // Manter apenas o primeiro item e resetar seu valor
    if (serviceItems.length > 0) {
        const firstItem = serviceItems[0];
        const select = firstItem.querySelector('.service-select');
        const otherInput = firstItem.querySelector('.other-service');
        const valueInput = firstItem.querySelector('.service-value');
        
        select.value = '';
        otherInput.value = '';
        otherInput.style.display = 'none';
        valueInput.value = '';
        
        // Remover todos os outros itens
        for (let i = 1; i < serviceItems.length; i++) {
            servicesContainer.removeChild(serviceItems[i]);
        }
    }
    
    // Resetar o valor total
    document.getElementById('totalValue').value = '0,00';
    
    // Limpar o PDF gerado
    window.pdfData = null;
    
    // Fechar o modal
    closeModal();
    
    // Voltar para a primeira etapa
    showStep(1);
}

// Função para adicionar um novo campo de acessório
function addAccessoryField() {
    const accessoriesContainer = document.getElementById('accessoriesContainer');
    
    // Criar novo item de acessório
    const newAccessoryItem = document.createElement('div');
    newAccessoryItem.className = 'accessory-item';
    
    // Criar select para o novo acessório
    const newSelect = document.createElement('select');
    newSelect.className = 'accessory-select';
    
    // Adicionar as opções ao select
    const options = [
        { value: '', text: 'Selecione um acessório...' },
        { value: 'Carregador', text: 'Carregador' },
        { value: 'Mouse', text: 'Mouse' },
        { value: 'Teclado', text: 'Teclado' },
        { value: 'Cabo USB', text: 'Cabo USB' },
        { value: 'Cabo HDMI', text: 'Cabo HDMI' },
        { value: 'Cabo de Rede', text: 'Cabo de Rede' },
        { value: 'Capa Protetora', text: 'Capa Protetora' },
        { value: 'Película', text: 'Película' },
        { value: 'Fone de Ouvido', text: 'Fone de Ouvido' },
        { value: 'Bateria', text: 'Bateria' },
        { value: 'Fonte de Alimentação', text: 'Fonte de Alimentação' },
        { value: 'Cartão de Memória', text: 'Cartão de Memória' },
        { value: 'Pen Drive', text: 'Pen Drive' },
        { value: 'HD Externo', text: 'HD Externo' },
        { value: 'Outro', text: 'Outro...' }
    ];
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        newSelect.appendChild(optionElement);
    });
    
    // Criar input para "Outro" acessório
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'other-accessory';
    otherInput.style.display = 'none';
    otherInput.placeholder = 'Especifique o acessório';
    
    // Criar botão para remover o acessório
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-accessory';
    removeButton.textContent = 'Remover';
    removeButton.addEventListener('click', function() {
        accessoriesContainer.removeChild(newAccessoryItem);
    });
    
    // Adicionar elementos ao novo item
    newAccessoryItem.appendChild(newSelect);
    newAccessoryItem.appendChild(otherInput);
    newAccessoryItem.appendChild(removeButton);
    
    // Adicionar o novo item ao container
    accessoriesContainer.appendChild(newAccessoryItem);
    
    // Configurar event listener para o novo select
    newSelect.addEventListener('change', handleAccessorySelectChange);
}

// Função para lidar com a mudança no select de acessórios
function handleAccessorySelectChange(event) {
    const select = event.target;
    const accessoryItem = select.closest('.accessory-item');
    const otherInput = accessoryItem.querySelector('.other-accessory');
    
    if (select.value === 'Outro') {
        otherInput.style.display = 'block';
        otherInput.setAttribute('required', 'required');
    } else {
        otherInput.style.display = 'none';
        otherInput.removeAttribute('required');
    }
}

// Função para configurar os listeners iniciais dos selects de acessórios
function setupInitialAccessoryListeners() {
    const initialSelects = document.querySelectorAll('.accessory-select');
    initialSelects.forEach(select => {
        select.addEventListener('change', handleAccessorySelectChange);
    });
}

// Função para lidar com a mudança no select de serviços
function handleServiceSelectChange(event) {
    const select = event.target;
    const serviceItem = select.closest('.service-item');
    const otherInput = serviceItem.querySelector('.other-service');
    
    if (select.value === 'Outro') {
        otherInput.style.display = 'block';
        otherInput.setAttribute('required', 'required');
    } else {
        otherInput.style.display = 'none';
        otherInput.removeAttribute('required');
    }
}

// Função para configurar os listeners iniciais dos selects de serviços
function setupInitialServiceListeners() {
    const initialSelects = document.querySelectorAll('.service-select');
    initialSelects.forEach(select => {
        select.addEventListener('change', handleServiceSelectChange);
    });
}

// Função para adicionar um novo campo de serviço
function addServiceField() {
    const servicesContainer = document.getElementById('servicesContainer');
    
    // Criar novo item de serviço
    const newServiceItem = document.createElement('div');
    newServiceItem.className = 'service-item';
    
    // Criar select para o novo serviço
    const newSelect = document.createElement('select');
    newSelect.className = 'service-select';
    
    // Adicionar as opções ao select
    const options = [
        { value: '', text: 'Selecione um serviço...' },
        { value: 'Formatação', text: 'Formatação' },
        { value: 'Troca de Sistema Operacional', text: 'Troca de Sistema Operacional' },
        { value: 'Limpeza', text: 'Limpeza' },
        { value: 'Troca de Peças', text: 'Troca de Peças' },
        { value: 'Backup de Dados', text: 'Backup de Dados' },
        { value: 'Instalação de Programas', text: 'Instalação de Programas' },
        { value: 'Remoção de Vírus', text: 'Remoção de Vírus' },
        { value: 'Reparo de Hardware', text: 'Reparo de Hardware' },
        { value: 'Outro', text: 'Outro...' }
    ];
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        newSelect.appendChild(optionElement);
    });
    
    // Criar input para "Outro" serviço
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'other-service';
    otherInput.style.display = 'none';
    otherInput.placeholder = 'Especifique o serviço';
    
    // Criar input para o valor do serviço
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'service-value';
    valueInput.placeholder = 'Valor (R$)';
    valueInput.min = '0';
    valueInput.step = '0.01';
    valueInput.addEventListener('input', calculateTotalValue);
    
    // Criar botão para remover o serviço
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-service';
    removeButton.textContent = 'Remover';
    removeButton.addEventListener('click', function() {
        servicesContainer.removeChild(newServiceItem);
        calculateTotalValue();
    });
    
    // Adicionar elementos ao novo item
    newServiceItem.appendChild(newSelect);
    newServiceItem.appendChild(otherInput);
    newServiceItem.appendChild(valueInput);
    newServiceItem.appendChild(removeButton);
    
    // Adicionar o novo item ao container
    servicesContainer.appendChild(newServiceItem);
    
    // Configurar event listener para o novo select
    newSelect.addEventListener('change', handleServiceSelectChange);
}

// Função para calcular o valor total do orçamento
function calculateTotalValue() {
    const valueInputs = document.querySelectorAll('.service-value');
    let total = 0;
    
    valueInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    // Formatar o valor total como moeda brasileira
    const formattedTotal = total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    document.getElementById('totalValue').value = formattedTotal;
}

// Função para buscar termos por CPF
function searchTerms() {
    const cpf = document.getElementById('searchCpf').value.replace(/\D/g, '');
    
    if (!cpf) {
        alert('Por favor, digite um CPF para buscar.');
        return;
    }
    
    const transaction = db.transaction(['terms'], 'readonly');
    const termsStore = transaction.objectStore('terms');
    const index = termsStore.index('clientCpf');
    const request = index.getAll(cpf);
    
    request.onsuccess = function() {
        const results = request.result;
        displaySearchResults(results);
    };
    
    request.onerror = function(event) {
        alert('Erro ao buscar termos: ' + event.target.error);
    };
}

// Função para exibir os resultados da busca
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum termo encontrado para este CPF.</p>';
        return;
    }
    
    let html = '<h3>Termos encontrados:</h3><ul class="results-list">';
    
    results.forEach(term => {
        const date = new Date(term.date);
        html += `
            <li>
                <div class="result-item">
                    <div class="result-info">
                        <p><strong>Cliente:</strong> ${term.clientName}</p>
                        <p><strong>Equipamento:</strong> ${term.equipmentType} - ${term.brand}</p>
                        <p><strong>Data:</strong> ${formatDate(date)}</p>
                    </div>
                    <div class="result-actions">
                        <button class="view-btn" onclick="viewTerm(${term.id})">Visualizar</button>
                    </div>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    resultsContainer.innerHTML = html;
}

// Função para visualizar um termo específico
function viewTerm(id) {
    const transaction = db.transaction(['terms'], 'readonly');
    const termsStore = transaction.objectStore('terms');
    const request = termsStore.get(id);
    
    request.onsuccess = function() {
        const term = request.result;
        
        if (term) {
            // Mostrar o modal
            const modal = document.getElementById('pdfModal');
            modal.style.display = 'block';
            
            // Exibir o PDF
            const pdfPreview = document.getElementById('pdfPreview');
            pdfPreview.innerHTML = `<iframe src="${term.pdfData}" width="100%" height="500px"></iframe>`;
        } else {
            alert('Termo não encontrado.');
        }
    };
    
    request.onerror = function(event) {
        alert('Erro ao buscar o termo: ' + event.target.error);
    };
}

// Função para carregar um termo pelo ID (usado quando acessado via URL)
function loadTermById(id) {
    const transaction = db.transaction(['terms'], 'readonly');
    const termsStore = transaction.objectStore('terms');
    const request = termsStore.get(Number(id));
    
    request.onsuccess = function() {
        const term = request.result;
        
        if (term) {
            // Mostrar a aba de consulta
            showTab('search');
            
            // Exibir o termo
            viewTerm(Number(id));
        } else {
            alert('Termo não encontrado.');
        }
    };
    
    request.onerror = function(event) {
        alert('Erro ao buscar o termo: ' + event.target.error);
    };
}

// Função para gerar a assinatura da empresa
function generateCompanySignature(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Limpar o canvas
    ctx.clearRect(0, 0, width, height);
    
    // Definir estilo do texto
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    // Desenhar o nome da empresa
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('I.A Manutenção e Tecnologia', width / 2, height / 2);
    
    // Desenhar uma linha para a assinatura
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height / 2 + 15);
    ctx.lineTo(width * 0.8, height / 2 + 15);
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
}

// Função para inicializar o formulário
function initForm() {
    // Inicializar o campo de assinatura
    initSignaturePad();
    
    // Inicializar os campos de equipamento e marca
    const equipmentTypeSelect = document.getElementById('equipmentType');
    const otherEquipmentField = document.getElementById('otherEquipmentField');
    
    equipmentTypeSelect.addEventListener('change', function() {
        if (this.value === 'Outro') {
            otherEquipmentField.style.display = 'block';
        } else {
            otherEquipmentField.style.display = 'none';
        }
    });
    
    const brandSelect = document.getElementById('brand');
    const otherBrandField = document.getElementById('otherBrandField');
    
    brandSelect.addEventListener('change', function() {
        if (this.value === 'Outra') {
            otherBrandField.style.display = 'block';
        } else {
            otherBrandField.style.display = 'none';
        }
    });
    
    // Inicializar o campo de descrição do problema
    const problemTypeSelect = document.getElementById('problemType');
    const problemDescriptionField = document.getElementById('problemDescription');
    
    problemTypeSelect.addEventListener('change', function() {
        if (this.value === 'Outro') {
            problemDescriptionField.style.display = 'block';
            problemDescriptionField.required = true;
            problemDescriptionField.placeholder = 'Descreva o problema em detalhes...';
        } else if (this.value === '') {
            problemDescriptionField.style.display = 'none';
            problemDescriptionField.required = false;
        } else {
            problemDescriptionField.style.display = 'block';
            problemDescriptionField.required = true;
            problemDescriptionField.placeholder = `Detalhes adicionais sobre "${this.value}"...`;
        }
    });
    
    // Inicializar os serviços
    initServices();
}
