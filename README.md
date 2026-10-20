# 🏠 House Clipper

**House Clipper** é um aplicativo desktop moderno para você **clipar vídeos do YouTube com máxima precisão visual sem ter que baixar o vídeo todo**, além de baixar vídeos completos em alta resolução tanto do **YouTube** quanto do **Twitter (X)**.

- **Versão Atual**: `v1.1.0`
- **Tema Visual**: Amarelo Queimado (*Warm Burnt Amber*)
- **Ícone**: Casa estilizada em amarelo queimado com a letra **C** azul cobalto no centro.

---

## ✨ Recursos de Clipagem Visual

1. **✂️ Régua Visual de Minutos (Timeline Ruler)**:
   - Divisões clicáveis de minuto a minuto (`00:00`, `01:00`, `02:00`, `03:00`...).
   - Pule instantaneamente para qualquer minuto do vídeo para localizar o momento desejado com um clique.
   - Pulos rápidos com botões: `⏪ -1 min`, `⏪ -10s`, `+10s ⏩`, `+1 min ⏩`.

2. **⏱️ Seletores Diretos de Minutos e Segundos**:
   - Defina início e fim digitando minutos e segundos diretamente (ex: `Min 03` e `Sec 15` até `Min 04` e `Sec 40`).
   - Botão **"Pegar Atual"** que captura no milissegundo a posição exata onde o player está pausado ou tocando.
   - Ajuste fino com botões de `-1s`, `-0.2s`, `+0.2s` e `+1s`.

3. **🎞️ Faixa Visual de Corte (Shaded Range) & Playhead**:
   - Destaque em amarelo queimado translúcido na barra da timeline mostrando a extensão exata do clipe em relação à duração total.
   - Indicador de reprodução em tempo real (*Playhead* verde) sincronizado com o player.

4. **📑 Reconhecimento Automático de Capítulos**:
   - Se o vídeo possuir capítulos ou marcadores de tempo oficiais no YouTube, o House Clipper lista todos os momentos em botões clicáveis que já configuram o corte para você.

5. **🔁 Pré-visualização do Corte**:
   - Botão **"Assistir Apenas o Trecho Selecionado"** que dá loop no intervalo escolhido antes de você gastar tempo baixando.

6. **⚡ Download Parcial (Zero Desperdício de Disco)**:
   - Baixa exclusivamente os segundos selecionados direto dos servidores do YouTube via HTTP ranges com FFmpeg, gerando o arquivo final em segundos.

7. **📥 Download Completo (YouTube & Twitter / X)**:
   - Baixa vídeos em resolução máxima (ou 1080p, 720p, etc.) ou extrai o áudio em MP3 tanto do YouTube quanto do Twitter (X).

---

## 🚀 Como Iniciar

Dê dois cliques no arquivo:
```
iniciar_house_clipper.bat
```
Ou execute pelo terminal:
```bash
python main.py
```
O aplicativo abrirá em uma **janela moderna de aplicativo desktop nativo**.
