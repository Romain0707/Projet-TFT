const canvas = document.getElementById("fight");
const ctx = canvas.getContext("2d");

const boardW = 6;  // Exemple de largeur du tableau (modifiable)
const boardH = 4;  // Exemple de hauteur du tableau (modifiable)

const BOARD_CORNERS = {
    TL: { x: 260, y: 250 },
    TR: { x: 650, y: 250 },
    BR: { x: 820, y: 430 },
    BL: { x: 80, y: 430 },
};

// Helper lerp
const lerp = (a, b, t) => a + (b - a) * t;

// Interpolation bilinéaire dans un quad
function quadPoint(u, v) {
    const { TL, TR, BR, BL } = BOARD_CORNERS;

    // point sur l'arête du haut et du bas
    const topX = lerp(TL.x, TR.x, u);
    const topY = lerp(TL.y, TR.y, u);
    const botX = lerp(BL.x, BR.x, u);
    const botY = lerp(BL.y, BR.y, u);

    return {
        x: lerp(topX, botX, v),
        y: lerp(topY, botY, v),
    };
}

// Récupère les 4 coins d'une cellule (x,y) dans la grille
function cellQuad(x, y) {
    const u0 = x / boardW;
    const u1 = (x + 1) / boardW;
    const v0 = y / boardH;
    const v1 = (y + 1) / boardH;

    const p00 = quadPoint(u0, v0); // top-left cell
    const p10 = quadPoint(u1, v0); // top-right cell
    const p11 = quadPoint(u1, v1); // bottom-right cell
    const p01 = quadPoint(u0, v1); // bottom-left cell

    return { p00, p10, p11, p01 };
}

function drawCell(x, y) {
    const { p00, p10, p11, p01 } = cellQuad(x, y);

    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();

    ctx.strokeStyle = "rgb(255, 0, 0)";
    ctx.stroke();
}

function drawBoardBackdrop() {
    const background = new Image();
    background.src = '../images/arene-background.png';  // Assurez-vous d'avoir un fond dans /public/images

    background.onload = function () {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        renderArena();
    };
}

// Dessine l'arène
function renderArena() {

    // Dessine les cellules de l'arène
    for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
            drawCell(x, y);
        }
    }
}

drawBoardBackdrop();