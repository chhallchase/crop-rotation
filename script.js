class CropRotationOptimizer {
    constructor() {
        this.plots = [];
        this.colors = ['yellow', 'red', 'blue'];
        this.colorEmojis = { yellow: '🟡', red: '🔴', blue: '🔵' };
        this.colorNames = { yellow: 'Yellow (Primal)', red: 'Red (Wild)', blue: 'Blue (Vivid)' };
        
        // Upgrade probabilities
        this.upgradeProbabilities = {
            1: 0.25, // T1 → T2
            2: 0.20, // T2 → T3
            3: 0.05  // T3 → T4
        };
        
        this.initializeUI();
    }

    initializeUI() {
        this.plotCountSelect = document.getElementById('plotCount');
        this.plotsContainer = document.getElementById('plotsContainer');
        this.optimizeBtn = document.getElementById('optimizeBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsContent = document.getElementById('resultsContent');

        this.plotCountSelect.addEventListener('change', () => this.generatePlotConfigs());
        this.optimizeBtn.addEventListener('click', () => this.optimizeRotation());

        // Initialize with 3 plots
        this.generatePlotConfigs();
    }

    generatePlotConfigs() {
        const plotCount = parseInt(this.plotCountSelect.value);
        this.plots = [];
        this.plotsContainer.innerHTML = '';

        for (let i = 0; i < plotCount; i++) {
            this.plots.push({ color1: 'yellow', color2: 'red' });
            this.createPlotConfigUI(i);
        }
    }

    createPlotConfigUI(plotIndex) {
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-config';
        plotDiv.innerHTML = `
            <h3>Plot ${plotIndex + 1}</h3>
            <div class="color-selection">
                <div class="color-group">
                    <label>Color 1:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow active" data-plot="${plotIndex}" data-slot="color1" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red" data-plot="${plotIndex}" data-slot="color1" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color1" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
                <div class="color-group">
                    <label>Color 2:</label>
                    <div class="color-buttons">
                        <button class="color-btn yellow" data-plot="${plotIndex}" data-slot="color2" data-color="yellow">
                            🟡 Yellow
                        </button>
                        <button class="color-btn red active" data-plot="${plotIndex}" data-slot="color2" data-color="red">
                            🔴 Red
                        </button>
                        <button class="color-btn blue" data-plot="${plotIndex}" data-slot="color2" data-color="blue">
                            🔵 Blue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for color selection
        const colorButtons = plotDiv.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectColor(e));
        });

        this.plotsContainer.appendChild(plotDiv);
    }

    selectColor(event) {
        const btn = event.target;
        const plotIndex = parseInt(btn.dataset.plot);
        const slot = btn.dataset.slot;
        const color = btn.dataset.color;

        // Update the plot data
        this.plots[plotIndex][slot] = color;

        // Update UI - remove active class from siblings and add to clicked button
        const siblings = btn.parentElement.querySelectorAll('.color-btn');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        btn.classList.add('active');
    }

    async optimizeRotation() {
        this.showLoading(true);
        
        // Simulate computation time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const result = this.calculateOptimalRotation();
            this.displayResults(result);
        } catch (error) {
            this.displayError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    calculateOptimalRotation() {
        // Generate all possible activation sequences
        const plotCount = this.plots.length;
        const sequences = this.generateAllSequences(plotCount);
        
        let bestSequence = null;
        let bestScore = -1;
        let bestResults = null;

        for (const sequence of sequences) {
            const result = this.simulateSequence(sequence);
            const score = this.calculateScore(result);
            
            if (score > bestScore) {
                bestScore = score;
                bestSequence = sequence;
                bestResults = result;
            }
        }

        return {
            sequence: bestSequence,
            results: bestResults,
            score: bestScore
        };
    }

    generateAllSequences(plotCount) {
        // Generate all possible combinations of plot activations
        // Each plot can be activated 0 to 3 times (more than 3 is usually overkill)
        const sequences = [];
        const maxActivations = Math.min(3, plotCount);
        
        // Generate sequences of different lengths
        for (let length = 1; length <= plotCount * 2; length++) {
            this.generateSequencesOfLength(plotCount, length, [], sequences);
        }
        
        // Also include some longer sequences for thorough optimization
        for (let i = 0; i < Math.min(100, plotCount * plotCount); i++) {
            const randomSequence = this.generateRandomSequence(plotCount, Math.floor(Math.random() * 6) + 3);
            sequences.push(randomSequence);
        }
        
        return sequences;
    }

    generateSequencesOfLength(plotCount, length, current, sequences) {
        if (current.length === length) {
            sequences.push([...current]);
            return;
        }
        
        for (let plotIndex = 0; plotIndex < plotCount; plotIndex++) {
            current.push(plotIndex);
            this.generateSequencesOfLength(plotCount, length, current, sequences);
            current.pop();
        }
    }

    generateRandomSequence(plotCount, length) {
        const sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push(Math.floor(Math.random() * plotCount));
        }
        return sequence;
    }

    simulateSequence(sequence) {
        // Initialize seed counts for each color and tier - start with 23 T1 seeds as per game mechanics
        const seedCounts = {};
        for (const color of this.colors) {
            seedCounts[color] = { 1: 23, 2: 0, 3: 0, 4: 0 }; // Start with 23 T1 seeds of each color
        }

        const activationLog = [];

        for (const plotIndex of sequence) {
            const plot = this.plots[plotIndex];
            const upgradedColors = this.colors.filter(color => 
                color !== plot.color1 && color !== plot.color2
            );

            // Log the activation
            activationLog.push({
                plotIndex: plotIndex + 1,
                plotColors: [plot.color1, plot.color2],
                upgradedColors: upgradedColors
            });

            // Upgrade seeds for non-plot colors
            for (const color of upgradedColors) {
                this.upgradeSeeds(seedCounts[color]);
            }
        }

        return {
            finalSeedCounts: seedCounts,
            activationLog: activationLog,
            totalT3Seeds: this.colors.reduce((sum, color) => sum + seedCounts[color][3], 0),
            totalT4Seeds: this.colors.reduce((sum, color) => sum + seedCounts[color][4], 0)
        };
    }

    upgradeSeeds(colorSeeds) {
        // Upgrade from T3 to T4 first (to avoid upgrading newly created T3s)
        const t3ToT4 = this.applyUpgradeChance(colorSeeds[3], this.upgradeProbabilities[3]);
        colorSeeds[3] -= t3ToT4;
        colorSeeds[4] += t3ToT4;

        // Upgrade from T2 to T3
        const t2ToT3 = this.applyUpgradeChance(colorSeeds[2], this.upgradeProbabilities[2]);
        colorSeeds[2] -= t2ToT3;
        colorSeeds[3] += t2ToT3;

        // Upgrade from T1 to T2
        const t1ToT2 = this.applyUpgradeChance(colorSeeds[1], this.upgradeProbabilities[1]);
        colorSeeds[1] -= t1ToT2;
        colorSeeds[2] += t1ToT2;
    }

    applyUpgradeChance(seedCount, probability) {
        // Use probabilistic simulation for more realistic results
        if (seedCount === 0) return 0;
        
        // For small numbers, use binomial distribution simulation
        if (seedCount <= 10) {
            let upgraded = 0;
            for (let i = 0; i < seedCount; i++) {
                if (Math.random() < probability) {
                    upgraded++;
                }
            }
            return upgraded;
        }
        
        // For larger numbers, use expected value with rounding
        return Math.round(seedCount * probability);
    }

    calculateScore(result) {
        // Prioritize T3 seeds, heavily penalize T4 seeds
        const t3Weight = 10;
        const t4Penalty = -5;
        
        return result.totalT3Seeds * t3Weight + result.totalT4Seeds * t4Penalty;
    }

    displayResults(optimization) {
        const { sequence, results, score } = optimization;
        
        let html = `
            <div class="rotation-sequence">
                <h3>Optimal Activation Sequence</h3>
                <div class="sequence-steps">
        `;
        
        sequence.forEach((plotIndex, step) => {
            const plot = this.plots[plotIndex];
            html += `
                <div class="step">
                    Step ${step + 1}: Plot ${plotIndex + 1} 
                    (${this.colorEmojis[plot.color1]} ${this.colorEmojis[plot.color2]})
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>T1 Seeds</th>
                        <th>T2 Seeds</th>
                        <th>T3 Seeds</th>
                        <th>T4 Seeds</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const color of this.colors) {
            const seeds = results.finalSeedCounts[color];
            html += `
                <tr>
                    <td>${this.colorEmojis[color]} ${this.colorNames[color]}</td>
                    <td>${seeds[1]}</td>
                    <td>${seeds[2]}</td>
                    <td><strong>${seeds[3]}</strong></td>
                    <td>${seeds[4]}</td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
            
            <div class="summary" style="margin-top: 20px; padding: 20px; background: rgba(255, 215, 0, 0.1); border-radius: 8px;">
                <h3 style="color: #ffd700; margin-bottom: 10px;">Summary</h3>
                <p><strong>Total T3 Seeds:</strong> ${results.totalT3Seeds}</p>
                <p><strong>Total T4 Seeds:</strong> ${results.totalT4Seeds}</p>
                <p><strong>Optimization Score:</strong> ${score}</p>
                <p><strong>Sequence Length:</strong> ${sequence.length} activations</p>
            </div>
        `;
        
        this.resultsContent.innerHTML = html;
    }

    displayError(message) {
        this.resultsContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff4757;">
                <h3>Optimization Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.optimizeBtn.disabled = show;
        if (show) {
            this.resultsContent.innerHTML = '';
        }
    }
}

// Initialize the optimizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CropRotationOptimizer();
}); 