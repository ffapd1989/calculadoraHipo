document.addEventListener('DOMContentLoaded', function() {
    const tooltips = document.querySelectorAll('.tooltip');

    tooltips.forEach(function(tooltip) {
        let timeout;
        tooltip.addEventListener('mouseover', function() {
            timeout = setTimeout(() => {
                const tooltipText = this.querySelector('.tooltiptext');
                tooltipText.style.visibility = 'visible';
                tooltipText.style.opacity = '1';
            }, 100);
        });

        tooltip.addEventListener('mouseout', function() {
            clearTimeout(timeout);
            const tooltipText = this.querySelector('.tooltiptext');
            tooltipText.style.visibility = 'hidden';
            tooltipText.style.opacity = '0';
        });
    });

    // Formatação automática do CPF
    document.getElementById('cpf').addEventListener('input', function(event) {
        let value = event.target.value;
        event.target.value = formatCPF(value);
    });

    // Cálculo das operações no campo de operações algébricas
    document.getElementById('operacaoRendaBruta').addEventListener('input', function(event) {
        try {
            let operation = event.target.value.replace(/[^\d+.,-]/g, ''); // Remove todos os caracteres não numéricos, exceto +, ., e ,
            operation = operation.replace(/,/g, '.'); // Substitui vírgula por ponto para cálculo
            let result = eval(operation); // Avalia a expressão matemática
            if (!isNaN(result)) {
                document.getElementById('rendaBruta').value = `R$ ${result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        } catch (e) {
            document.getElementById('rendaBruta').value = 'R$ 0,00';
        }
    });

    // Evita o envio automático do formulário e processa os dados manualmente
    document.getElementById('eligibility-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value;
        const rendaBrutaInput = document.getElementById('rendaBruta').value.replace("R$ ", "").replace(/\./g, '').replace(',', '.');
        const dependentesOrdinarios = parseInt(document.getElementById('dependentesOrdinarios').value);
        const dependentesEspeciais = parseInt(document.getElementById('dependentesEspeciais').value);

        // Validação do CPF
        if (cpf.length !== 14) {
            showFeedback("CPF deve conter 11 dígitos.", "error");
            return;
        }

        // Verificar se a renda bruta foi convertida corretamente
        const rendaBruta = parseFloat(rendaBrutaInput);
        if (isNaN(rendaBruta)) {
            showFeedback("Valor de renda bruta inválido.", "error");
            return;
        }

        // Mostrar mensagem de carregamento
        document.getElementById('loading').style.display = 'block';
        document.getElementById('conclusoes').style.display = 'none';

        fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados?formato=json')
            .then(response => response.json())
            .then(data => {
                const salarioMinimo = parseFloat(data[data.length - 1].valor);
                const descontoDO = 0.25 * salarioMinimo;
                const descontoDPNE = 0.5 * salarioMinimo;
                const totalDescontoDO = descontoDO * dependentesOrdinarios;
                const totalDescontoDPNE = descontoDPNE * dependentesEspeciais;
                const rendaAjustada = rendaBruta - totalDescontoDO - totalDescontoDPNE;
                const tresSMN = 3 * salarioMinimo;

                const conclusoesDiv = document.getElementById('conclusoes');
                conclusoesDiv.innerHTML = '';

                if (rendaAjustada <= tresSMN) {
                    showFeedback("ASSISTIDO ESTÁ <u>DENTRO</u> DOS CRITÉRIOS DE HIPOSSUFICIÊNCIA ECONÔMICA da DPERS.", "success");
                } else {
                    const excedente = rendaAjustada - tresSMN;
                    showFeedback(`A RENDA <u>NÃO</u> ATENDE AOS CRITÉRIOS de HIPOSSUFICIÊNCIA ECONÔMICA DA DPERS. <br> Limite de renda de 3 SMN excedido em R$ ${excedente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`, "error");
                }

                // Mostrar detalhes do cálculo
                const calculoDetalhesDiv = document.createElement('div');
                calculoDetalhesDiv.id = 'calculo-detalhes';
                calculoDetalhesDiv.innerHTML = `
                    <p>(1) Salário Mínimo Nacional: <b>R$ ${salarioMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> <i>(obtido via SGS-BACEN)</i></p>
                    <p>(2) Valor de 3 Salários Mínimos Nacionais: <b>R$ ${tresSMN.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
                    <p>(3) Desconto por Dependente Ordinário (25% do SMN): R$ ${descontoDO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x ${dependentesOrdinarios} pessoa(s) = <b>R$ ${totalDescontoDO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
                    <p>(4) Desconto por Dependente Especial (50% do SMN): R$ ${descontoDPNE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x ${dependentesEspeciais} pessoa(s) = <b>R$ ${totalDescontoDPNE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
                    <p>(5) Renda com descontos de dependentes: <b>R$ ${rendaAjustada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
                    <p><u><b>NOTA:</b> a elegibilidade é aferida pela comparação do item (5) com o item (2) acima.</u></p>
                `;
                conclusoesDiv.appendChild(calculoDetalhesDiv);

                // Mostrar data e hora do cálculo
                const dataHoraDiv = document.getElementById('dataHora');
                const agora = new Date();
                const dataFormatada = agora.toLocaleDateString('pt-BR');
                const horaFormatada = agora.toLocaleTimeString('pt-BR');
                dataHoraDiv.textContent = `Data e hora do cálculo: ${dataFormatada} ${horaFormatada}`;

                // Ocultar mensagem de carregamento e mostrar resultados
                document.getElementById('loading').style.display = 'none';
                conclusoesDiv.style.display = 'block';
                document.getElementById('imprimir').style.display = 'block';
                document.getElementById('recarregar').style.display = 'block';
                document.getElementById('operacaoRendaBruta').style.display = 'none'; // Ocultar campo de operação de renda bruta
            })
            .catch(error => {
                showFeedback("Erro ao buscar o valor do salário mínimo.", "error");
                document.getElementById('loading').style.display = 'none';
            });
    });
});

// Função para a impressão funcionar e o botão recarregar também
document.getElementById('imprimir').addEventListener('click', function() {
    window.print();
});

document.getElementById('recarregar').addEventListener('click', function() {
    location.reload();
});

// Função para formatar o CPF automaticamente durante a digitação
function formatCPF(value) {
    value = value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
}

// Função para exibir feedback
function showFeedback(message, type) {
    const conclusoesDiv = document.getElementById('conclusoes');
    conclusoesDiv.innerHTML = message;
    conclusoesDiv.className = type;
    conclusoesDiv.style.display = "block";
}
