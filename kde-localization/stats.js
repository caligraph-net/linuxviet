let currentSort = { column: 'total', direction: 'desc' };
let lastTotalTranslated = -1;
let lastTotalFuzzy = -1;
let lastTotalUntranslated = -1;

function sortTable(column, direction) {
    const table = d3.select("#statsTable");
    const folderRows = table.selectAll("tr.folder").nodes();
    const fileRowsMap = new Map();

    // Group file rows by their parent folder
    table.selectAll("tr.file").each(function() {
        const folder = d3.select(this).attr('data-folder');
        if (!fileRowsMap.has(folder)) {
            fileRowsMap.set(folder, []);
        }
        fileRowsMap.get(folder).push(this);
    });

    const compare = (a, b) => {
        const aValue = d3.select(a).select(`td:nth-child(${getColumnIndex(column)})`).text();
        const bValue = d3.select(b).select(`td:nth-child(${getColumnIndex(column)})`).text();
        return column === 'item' ? aValue.localeCompare(bValue) : Number(aValue) - Number(bValue);
    };

    // Sort folder rows
    folderRows.sort((a, b) => {
        return direction === 'asc' ? compare(a, b) : compare(b, a);
    });

    // Clear the table
    table.selectAll("tr:not(:first-child)").remove();

    // Append sorted folders and their files
    folderRows.forEach(folderRow => {
        table.node().appendChild(folderRow);
        const folderName = d3.select(folderRow).select('td').text();
        const fileRows = fileRowsMap.get(folderName) || [];

        // Sort file rows within this folder
        fileRows.sort((a, b) => {
            return direction === 'asc' ? compare(a, b) : compare(b, a);
        });

        // Append sorted file rows
        fileRows.forEach(fileRow => {
            table.node().appendChild(fileRow);
        });
    });

    updateSortArrows(column);
}

function getColumnIndex(column) {
    const columns = ['item', 'translated', 'fuzzy', 'untranslated', 'total'];
    return columns.indexOf(column) + 1;
}

function updateSortArrows(column) {
    d3.selectAll('th').classed('sorted-asc', false).classed('sorted-desc', false);
    const header = d3.select(`th[data-sort="${column}"]`);
    header.classed(`sorted-${currentSort.direction}`, true);
}

function loadSelectedFile() {
    const selectedFile = d3.select("#fileSelector").property("value");
    if (selectedFile) {
        loadAndDisplayStats(selectedFile);
    }
}


function loadAndDisplayStats(fileName) {
    const timestamp = new Date().getTime();
    fetch(`${fileName}?t=${timestamp}`)
    .then(response => response.json())
    .then(data => {
        // Clear existing table rows
        d3.select("#statsTable").selectAll("tr:not(:first-child)").remove();

        const folderStats = {};
        let totalTranslated = 0;
        let totalFuzzy = 0;
        let totalUntranslated = 0;

        data.forEach(item => {
            const path = item.file;
            const stats = item.stats;
            const [folder, file] = path.split('/');

            if (!folderStats[folder]) {
                folderStats[folder] = { translated: 0, fuzzy: 0, untranslated: 0, files: [] };
            }
            folderStats[folder].translated += stats.translated;
            folderStats[folder].fuzzy += stats.fuzzy;
            folderStats[folder].untranslated += stats.untranslated;

            totalTranslated += stats.translated;
            totalFuzzy += stats.fuzzy;
            totalUntranslated += stats.untranslated;

            folderStats[folder].files.push({ file, stats });
        });

        // Update the sum display
        const totalEverything = totalTranslated + totalFuzzy + totalUntranslated;
        const pctTranslated = Math.floor(totalTranslated * 1000 / totalEverything) / 10;
        const pctFuzzy = Math.floor(totalFuzzy * 1000 / totalEverything) / 10;
        const pctUntranslated = Math.ceil((100 - pctTranslated - pctFuzzy) * 10) / 10;

        let deltaTranslated = 0;
        let deltaFuzzy = 0;
        let deltaUntranslated = 0;

        if (lastTotalUntranslated > 0 ) {
            deltaTranslated = totalTranslated - lastTotalTranslated;
            deltaFuzzy = totalFuzzy - lastTotalFuzzy;
            deltaUntranslated = totalUntranslated - lastTotalUntranslated;
        }

        lastTotalTranslated = totalTranslated;
        lastTotalFuzzy = totalFuzzy;
        lastTotalUntranslated = totalUntranslated;

        d3.select("#sumTranslated").text(`${totalTranslated} (${pctTranslated}%) ${(deltaTranslated > 0 ? "+" : "") + deltaTranslated}`);
        d3.select("#sumFuzzy").text(`${totalFuzzy} (${pctFuzzy}%) ${(deltaFuzzy > 0 ? "+" : "") + deltaFuzzy}`);
        d3.select("#sumUntranslated").text(`${totalUntranslated} (${pctUntranslated}%) ${(deltaUntranslated > 0 ? "+" : "") + deltaUntranslated}`);
        

        const table = d3.select("#statsTable");
        Object.entries(folderStats).forEach(([folder, stats]) => {
            addRow(table, folder, folder, stats, 'folder', 'folderTitle');
            stats.files.forEach(fileInfo => {
                addRow(table, `${folder}/${fileInfo.file}`, fileInfo.file, fileInfo.stats, 'file', 'fileTitle');
            });
        });

        d3.selectAll('.folderTitle').on('click', function() {
            const folderName = d3.select(this).text();
            const files = d3.selectAll(`.file[data-folder="${folderName}"]`);
            const isHidden = files.style('display') === 'none';
            files.style('display', isHidden ? 'table-row' : 'none');
        });

        d3.selectAll('.sortable').on('click', function() {
            const column = d3.select(this).attr('data-sort');
            
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = { column, direction: 'asc' };
            }

            sortTable(column, currentSort.direction);
        });

        sortTable(currentSort.column, currentSort.direction);
    });
}

function addRow(table, name, title, stats, className, titleClass) {
    const total = stats.translated + stats.fuzzy + stats.untranslated;
    let graphWidth = total / 4;
    let minGraphWidth = 50;
    let maxGraphWidth = 1000;

    if (graphWidth < minGraphWidth && graphWidth > 0) graphWidth = minGraphWidth;
    if (graphWidth > maxGraphWidth) graphWidth = maxGraphWidth;

    const row = table.append("tr").attr('class', className).attr('data-folder', name.split('/')[0]);
    row.append("td").text(title).attr('class', titleClass);
    row.append("td").text(stats.translated);
    row.append("td").text(stats.fuzzy);
    row.append("td").text(stats.untranslated);
    row.append("td").text(total);

    const svg = row.append("td").append("svg")
        .attr("width", graphWidth)
        .attr("height", 20);

    svg.append("rect")
        .attr("width", stats.translated / total * graphWidth)
        .attr("height", 20)
        .attr("fill", "#48c78e");

    svg.append("rect")
        .attr("x", stats.translated / total * graphWidth)
        .attr("width", stats.fuzzy / total * graphWidth)
        .attr("height", 20)
        .attr("fill", "#ffe08a");

    svg.append("rect")
        .attr("x", (stats.translated + stats.fuzzy) / total * graphWidth)
        .attr("width", stats.untranslated / total * graphWidth)
        .attr("height", 20)
        .attr("fill", "#f14668");
}

const timestamp = new Date().getTime();
// Load the list of files
fetch(`all-stats.json?t=${timestamp}`)
    .then(response => response.json())
    .then(files => {
        const selector = d3.select("#fileSelector");
        files.forEach(file => {
            selector.append("option")
                .attr("value", file)
                .text(file);
        });

        // Add event listener to the dropdown
        selector.on("change", loadSelectedFile);

        // Automatically select and load the last file
        if (files.length > 0) {
            const lastFile = files[files.length - 1];
            selector.property("value", lastFile);
            loadSelectedFile();
        }
    });