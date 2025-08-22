import inquirer from 'inquirer';
import { blacklist, saveBlacklist } from '../config/database.js';

export async function listBlacklist() {
    if (blacklist.length === 0) {
        console.log('📭 No hay contactos en la lista negra.');
        return;
    }

    console.log('\n🚫 Contactos en la lista negra:');
    console.log('='.repeat(60));

    blacklist.forEach((contact, index) => {
        const cleanNumber = contact.replace('@c.us', '');
        console.log(`${index + 1}. ${cleanNumber}`);
    });
}

export async function addToBlacklist() {
    const { chatNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'chatNumber',
            message: 'Número de chat para añadir a la lista negra (ej: 9511110360):',
            validate: input => input.trim() !== '' || 'El número es requerido'
        }
    ]);

    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;

    if (blacklist.includes(formattedNumber)) {
        console.log('⚠️  Este contacto ya está en la lista negra.');
        return;
    }

    blacklist.push(formattedNumber);
    await saveBlacklist();
    console.log('✅ Contacto añadido a la lista negra.');
}

export async function removeFromBlacklist() {
    if (blacklist.length === 0) {
        console.log('📭 No hay contactos en la lista negra para eliminar.');
        return;
    }

    const { chatNumber } = await inquirer.prompt([
        {
            type: 'list',
            name: 'chatNumber',
            message: 'Selecciona el contacto a eliminar de la lista negra:',
            choices: blacklist.map(contact => ({
                name: contact.replace('@c.us', ''),
                value: contact
            }))
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres eliminar este contacto de la lista negra?',
            default: false
        }
    ]);

    if (confirm) {
        const index = blacklist.indexOf(chatNumber);
        blacklist.splice(index, 1);
        await saveBlacklist();
        console.log('✅ Contacto eliminado de la lista negra.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

export async function clearBlacklist() {
    if (blacklist.length === 0) {
        console.log('📭 La lista negra ya está vacía.');
        return;
    }

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Estás seguro de que quieres limpiar toda la lista negra?',
            default: false
        }
    ]);

    if (confirm) {
        blacklist.length = 0;
        await saveBlacklist();
        console.log('✅ Lista negra limpiada correctamente.');
    } else {
        console.log('❌ Operación cancelada.');
    }
}

export async function checkBlacklist() {
    const { chatNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'chatNumber',
            message: 'Número de chat para verificar (ej: 9511110360):',
            validate: input => input.trim() !== '' || 'El número es requerido'
        }
    ]);

    const formattedNumber = chatNumber.includes('@c.us') ? chatNumber : `${chatNumber}@c.us`;
    const isBlacklisted = blacklist.includes(formattedNumber);

    if (isBlacklisted) {
        console.log(`🚫 El contacto ${chatNumber} SÍ está en la lista negra.`);
    } else {
        console.log(`✅ El contacto ${chatNumber} NO está en la lista negra.`);
    }
}

export async function importToBlacklist() {
    const { numbers } = await inquirer.prompt([
        {
            type: 'input',
            name: 'numbers',
            message: 'Ingresa los números separados por comas (ej: 9511110360,9511110361):',
            validate: input => input.trim() !== '' || 'Debes ingresar al menos un número'
        }
    ]);

    const numbersList = numbers.split(',').map(num => {
        const cleanNum = num.trim();
        return cleanNum.includes('@c.us') ? cleanNum : `${cleanNum}@c.us`;
    });

    let addedCount = 0;
    let skippedCount = 0;

    numbersList.forEach(number => {
        if (!blacklist.includes(number)) {
            blacklist.push(number);
            addedCount++;
        } else {
            skippedCount++;
        }
    });

    await saveBlacklist();

    console.log(`✅ Importación completada:`);
    console.log(`   📝 Números añadidos: ${addedCount}`);
    console.log(`   ⚠️  Números omitidos (ya existían): ${skippedCount}`);
}

export async function handleBlacklistCommand() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '¿Qué deseas hacer con la lista negra?',
            choices: [
                { name: '📋 Listar contactos bloqueados', value: 'list' },
                { name: '➕ Añadir contacto a la lista negra', value: 'add' },
                { name: '🗑️  Eliminar contacto de la lista negra', value: 'remove' },
                { name: '🔍 Verificar si un contacto está bloqueado', value: 'check' },
                { name: '📤 Importar múltiples números', value: 'import' },
                { name: '🧹 Limpiar toda la lista negra', value: 'clear' }
            ]
        }
    ]);

    switch (action) {
        case 'list':
            await listBlacklist();
            break;
        case 'add':
            await addToBlacklist();
            break;
        case 'remove':
            await removeFromBlacklist();
            break;
        case 'check':
            await checkBlacklist();
            break;
        case 'import':
            await importToBlacklist();
            break;
        case 'clear':
            await clearBlacklist();
            break;
    }
}
