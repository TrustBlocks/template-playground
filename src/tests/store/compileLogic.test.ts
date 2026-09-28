import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAppStore from '../../store/store';

/**
 * compileLogic is the clause runtime's own check (trustblocks-logic.js's
 * TrustblocksLogic.check, run in the sandbox): the clause is built without
 * being run, and anything outside the vocabulary is refused.
 */
describe('useAppStore - compileLogic', () => {
  beforeEach(() => {
    useAppStore.setState({
      logicTs: '(let [event (get request "$class")] {})',
      isCompiling: false,
      compilationErrors: [],
      compiledLogicJs: null,
      isProblemPanelVisible: false,
      isSandboxReady: true,
    });
  });

  it('a clause the vocabulary allows is checked, and becomes runnable', async () => {
    const executeInSandbox = vi.fn().mockResolvedValue(null);
    useAppStore.setState({ executeInSandbox });

    await useAppStore.getState().compileLogic();

    const state = useAppStore.getState();
    expect(executeInSandbox).toHaveBeenCalledWith('', 'check', ['(let [event (get request "$class")] {})']);
    expect(state.compiledLogicJs).toBe('(let [event (get request "$class")] {})');
    expect(state.compilationErrors).toEqual([]);
    expect(state.isCompiling).toBe(false);
  });

  it('an accepted clause comes back from the sandbox as {} (a null result), and is checked', async () => {
    useAppStore.setState({ executeInSandbox: vi.fn().mockResolvedValue({}) });

    await useAppStore.getState().compileLogic();

    expect(useAppStore.getState().compiledLogicJs).toBe('(let [event (get request "$class")] {})');
    expect(useAppStore.getState().compilationErrors).toEqual([]);
  });

  it('a clause reaching outside the vocabulary is refused, with why', async () => {
    useAppStore.setState({
      logicTs: '(rand)',
      executeInSandbox: vi.fn().mockResolvedValue('Could not resolve symbol: rand'),
    });

    await useAppStore.getState().compileLogic();

    const state = useAppStore.getState();
    expect(state.compiledLogicJs).toBeNull();
    expect(state.compilationErrors).toEqual([
      { message: 'Refused by the clause vocabulary: Could not resolve symbol: rand' },
    ]);
    expect(state.isProblemPanelVisible).toBe(true);
  });

  it('no clause: nothing to check', async () => {
    const executeInSandbox = vi.fn();
    useAppStore.setState({ logicTs: '  ', executeInSandbox });

    await useAppStore.getState().compileLogic();

    expect(executeInSandbox).not.toHaveBeenCalled();
    expect(useAppStore.getState().compiledLogicJs).toBeNull();
  });

  it('a runtime that fails is reported, not swallowed', async () => {
    useAppStore.setState({ executeInSandbox: vi.fn().mockRejectedValue(new Error('Sandbox gone')) });

    await useAppStore.getState().compileLogic();

    expect(useAppStore.getState().compilationErrors).toEqual([{ message: 'Sandbox gone' }]);
  });
});
