import { buildWithClaude } from './claude-builder.js';
async function testTicTacToe() {
    console.log('🎮 开始使用Claude Builder生成井字小游戏...\n');
    try {
        const result = await buildWithClaude("创建一个完整的网页版井字小游戏（Tic Tac Toe），要求：1. 使用HTML、CSS、JavaScript实现 2. 具有游戏逻辑（检测胜利、平局） 3. 支持玩家轮流下棋 4. 美观的UI设计 5. 重新开始游戏功能 6. 显示当前玩家和游戏状态", "./tic-tac-toe.html");
        console.log('✅ 游戏生成成功！');
        console.log(`📁 文件路径: ${result.filePath}`);
        console.log(`🔤 语言: ${result.language}`);
        console.log(`📝 说明: ${result.explanation}\n`);
        console.log('🎯 生成的代码预览:');
        console.log('='.repeat(50));
        console.log(result.code.substring(0, 500) + '...');
        console.log('='.repeat(50));
        return result;
    }
    catch (error) {
        console.error('❌ 生成失败:', error.message);
        throw error;
    }
}
// 执行测试
testTicTacToe()
    .then(() => {
    console.log('\n🎉 测试完成！可以在浏览器中打开 tic-tac-toe.html 查看游戏');
})
    .catch((error) => {
    console.error('\n💥 测试失败:', error);
});
//# sourceMappingURL=test-builder.js.map