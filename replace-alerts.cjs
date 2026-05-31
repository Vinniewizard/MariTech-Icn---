const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

content = content.replace(/alert\('Invalid admin key'\);/g, "triggerToast('Invalid admin key', false);");
content = content.replace(/alert\('Failed to fetch data'\);/g, "triggerToast('Failed to fetch data', false);");
content = content.replace(/alert\('User details updated successfully'\);/g, "triggerToast('User details updated successfully', true);");
content = content.replace(/alert\('Failed to update: ' \+ data.message\);/g, "triggerToast('Failed to update: ' + data.message, false);");
content = content.replace(/alert\('Failed to update user'\);/g, "triggerToast('Failed to update user', false);");
content = content.replace(/alert\('Failed to process deposit'\);/g, "triggerToast('Failed to process deposit', false);");
content = content.replace(/alert\('Game settings updated successfully'\);/g, "triggerToast('Game settings updated successfully', true);");
content = content.replace(/alert\('Failed to update game settings'\);/g, "triggerToast('Failed to update game settings', false);");
content = content.replace(/alert\('Invalid GADMIN Credentials. Access denied.'\);/g, "triggerToast('Invalid GADMIN Credentials. Access denied.', false);");
content = content.replace(/alert\('Failed to pin notification message.'\);/g, "triggerToast('Failed to pin notification message.', false);");
content = content.replace(/alert\('Failed to unpin notification message.'\);/g, "triggerToast('Failed to unpin notification message.', false);");
content = content.replace(/alert\(data\.realSent \? 'Dispatched real message to Telegram client!' : 'Added notice to Group broadcast queue\.'\);/g, "triggerToast(data.realSent ? 'Dispatched real message to Telegram client!' : 'Added notice to Group broadcast queue.', true);");
content = content.replace(/alert\('Failed to send broadcast'\);/g, "triggerToast('Failed to send broadcast', false);");
content = content.replace(/alert\('Error broadcasting message'\);/g, "triggerToast('Error broadcasting message', false);");
content = content.replace(/alert\('Telegram configuration updated successfully.'\);/g, "triggerToast('Telegram configuration updated successfully.', true);");
content = content.replace(/alert\('Failed to update Telegram configuration.'\);/g, "triggerToast('Failed to update Telegram configuration.', false);");
content = content.replace(/alert\('Error updating configuration'\);/g, "triggerToast('Error updating configuration', false);");
content = content.replace(/alert\('Chat Enabled!'\);/g, "triggerToast('Chat Enabled!', true);");
content = content.replace(/alert\('Chat Disabled!'\);/g, "triggerToast('Chat Disabled!', true);");

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
