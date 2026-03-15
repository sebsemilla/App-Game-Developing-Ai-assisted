// js/core/HistoryManager.js
export class HistoryManager {
    constructor(maxSteps = 20) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSteps = maxSteps;
    }

    push(action) {
        this.undoStack.push(action);
        this.redoStack = []; // Limpiar redo stack cuando hay nueva acción

        // Limitar tamaño del historial
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop();
        this.redoStack.push(action);

        return action;
    }

    redo() {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop();
        this.undoStack.push(action);

        return action;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

// Tipos de acciones
export const ActionTypes = {
    ADD_OBJECT: 'ADD_OBJECT',
    REMOVE_OBJECT: 'REMOVE_OBJECT',
    MOVE_OBJECT: 'MOVE_OBJECT',
    ROTATE_OBJECT: 'ROTATE_OBJECT',
    SCALE_OBJECT: 'SCALE_OBJECT',
    CHANGE_COLOR: 'CHANGE_COLOR',
    ADD_TAG: 'ADD_TAG',
    REMOVE_TAG: 'REMOVE_TAG',
    GROUP: 'GROUP',
    UNGROUP: 'UNGROUP'
};