// js/core/ObjectManager.js
export class ObjectManager {
    constructor(editor) {
        this.editor = editor;
        this.objects = new Map();
        this.groups = new Map();
        this.tags = new Map();
    }

    addObject(mesh, type) {
        const id = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        mesh.userData = {
            id: id,
            type: type,
            name: `${type}_${id.substr(0, 4)}`,
            tags: [],
            group: null,
            createdAt: new Date().toISOString(),
            properties: {}
        };

        this.objects.set(id, mesh);
        return id;
    }

    createGroup(name) {
        const groupId = 'group_' + Date.now();
        const group = {
            id: groupId,
            name: name,
            objects: [],
            visible: true
        };
        this.groups.set(groupId, group);
        return groupId;
    }

    addToGroup(objectId, groupId) {
        const obj = this.objects.get(objectId);
        const group = this.groups.get(groupId);

        if (obj && group) {
            obj.userData.group = groupId;
            group.objects.push(objectId);
        }
    }

    addTag(objectId, tag) {
        const obj = this.objects.get(objectId);
        if (obj) {
            if (!obj.userData.tags.includes(tag)) {
                obj.userData.tags.push(tag);
            }
        }
    }

    findObjectsByTag(tag) {
        const results = [];
        this.objects.forEach((obj, id) => {
            if (obj.userData.tags.includes(tag)) {
                results.push(obj);
            }
        });
        return results;
    }
}